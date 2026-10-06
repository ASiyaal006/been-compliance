import { createAnthropic } from "@ai-sdk/anthropic";
import { generateObject, type FilePart, type ImagePart, type UserModelMessage } from "ai";
import { getSessionUser } from "@/lib/supabase/auth";
import { normalizeIsoDate, parsedDocumentSchema } from "@/lib/types/parsed-document";

export const maxDuration = 60;

const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const EXTRACTION_PROMPT =
  "Extract compliance and asset data from this inspection certificate, test report, or asset plate. " +
  "Return only values clearly visible on the document. Use YYYY-MM-DD for dates. " +
  "Use empty strings when a field is not present.";

type ParsedFile = {
  data: Uint8Array;
  mediaType: string;
  filename: string;
};

function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

function decodeBase64Payload(base64Input: string, mediaTypeHint?: string): ParsedFile {
  const trimmed = base64Input.trim();
  const dataUriMatch = trimmed.match(/^data:([^;,]+)(?:;[^,]*)?;base64,([\s\S]+)$/);

  if (dataUriMatch) {
    const [, mediaTypeFromUri, payload] = dataUriMatch;
    return {
      data: Uint8Array.from(Buffer.from(payload, "base64")),
      mediaType: mediaTypeHint?.trim() || mediaTypeFromUri,
      filename: "upload",
    };
  }

  if (!mediaTypeHint?.trim()) {
    throw new Error("JSON body must include file.mimeType, or send a data URI in file.base64.");
  }

  return {
    data: Uint8Array.from(Buffer.from(trimmed, "base64")),
    mediaType: mediaTypeHint.trim(),
    filename: "upload",
  };
}

async function readUploadedFile(req: Request): Promise<ParsedFile | Response> {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const entry = formData.get("file");

    if (!(entry instanceof File) || entry.size === 0) {
      return jsonError("Upload a file using the 'file' field.");
    }

    const mediaType = entry.type || "application/octet-stream";
    const buffer = new Uint8Array(await entry.arrayBuffer());

    return { data: buffer, mediaType, filename: entry.name || "upload" };
  }

  if (contentType.includes("application/json")) {
    const body = (await req.json()) as {
      file?: { base64?: string; mimeType?: string; mediaType?: string; filename?: string };
    };

    const base64 = body.file?.base64?.trim();
    if (!base64) {
      return jsonError("JSON body must include file.base64.");
    }

    try {
      const parsed = decodeBase64Payload(
        base64,
        body.file?.mediaType ?? body.file?.mimeType,
      );
      return {
        ...parsed,
        filename: body.file?.filename?.trim() || parsed.filename,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid base64 payload.";
      return jsonError(message);
    }
  }

  return jsonError("Send multipart/form-data with a file, or JSON with file.base64 and file.mimeType.");
}

function buildUserMessage(file: ParsedFile): UserModelMessage | null {
  const textPart = { type: "text" as const, text: EXTRACTION_PROMPT };

  if (SUPPORTED_IMAGE_TYPES.has(file.mediaType)) {
    const imagePart: ImagePart = {
      type: "image",
      image: file.data,
      mediaType: file.mediaType,
    };

    return {
      role: "user",
      content: [textPart, imagePart],
    };
  }

  if (file.mediaType === "application/pdf") {
    const filePart: FilePart = {
      type: "file",
      data: file.data,
      mediaType: file.mediaType,
      filename: file.filename,
    };

    return {
      role: "user",
      content: [textPart, filePart],
    };
  }

  return null;
}

function normalizeParsedDates<T extends { inspectionDate: string; expiryDate: string }>(data: T): T {
  return {
    ...data,
    inspectionDate: normalizeIsoDate(data.inspectionDate),
    expiryDate: normalizeIsoDate(data.expiryDate),
  };
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return jsonError("ANTHROPIC_API_KEY is not configured", 500);
  }

  const fileResult = await readUploadedFile(req);
  if (fileResult instanceof Response) return fileResult;

  const message = buildUserMessage(fileResult);
  if (!message) {
    return jsonError("Unsupported file type. Upload a JPEG, PNG, WebP, GIF, or PDF.");
  }

  try {
    const anthropic = createAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || "",
    });

    const { object } = await generateObject({
      model: anthropic("claude-sonnet-5-5"),
      schema: parsedDocumentSchema,
      schemaName: "ParsedComplianceDocument",
      schemaDescription:
        "Structured fields extracted from an industrial compliance certificate or asset document.",
      messages: [message],
      // The provider doesn't recognise newer model ids, so it falls back to a forced
      // tool call, which these models reject. Use native structured outputs instead.
      providerOptions: {
        anthropic: { structuredOutputMode: "outputFormat" },
      },
      maxOutputTokens: 4096,
    });

    return Response.json({
      data: normalizeParsedDates(object),
      meta: {
        filename: fileResult.filename,
        mediaType: fileResult.mediaType,
      },
    });
  } catch (error) {
    console.error("parse-document failed:", error);

    const message = error instanceof Error ? error.message : "Failed to parse document.";
    return Response.json({ error: message }, { status: 500 });
  }
}
