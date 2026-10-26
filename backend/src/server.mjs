import "dotenv/config";
import { randomUUID } from "node:crypto";
import express from "express";
import cors from "cors";
import multer from "multer";
import sharp from "sharp";
import rateLimit from "express-rate-limit";
import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const required = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_PROCESSED_BUCKET",
];

const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`Missing backend environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const app = express();
const port = Number(process.env.PORT || 8080);
const processedBucket = process.env.R2_PROCESSED_BUCKET;
const publicBaseUrl = (process.env.R2_PUBLIC_BASE_URL || "").replace(/\/+$/, "");

const authClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

app.disable("x-powered-by");
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use(
  "/v1/media",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    const supported = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!supported.includes(file.mimetype)) {
      const error = new Error(
        "Unsupported image type. Choose a JPEG, PNG, or WebP image."
      );
      error.statusCode = 415;
      return callback(error);
    }

    callback(null, true);
  },
});

function makePublicUrl(key) {
  if (!publicBaseUrl) {
    const error = new Error(
      "Processed-media delivery is not configured yet."
    );
    error.statusCode = 503;
    throw error;
  }

  const encodedKey = key
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  return `${publicBaseUrl}/${encodedKey}`;
}

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const match = header.match(/^Bearer\s+(.+)$/i);

    if (!match) {
      return res.status(401).json({ error: "Sign in to upload media." });
    }

    const {
      data: { user },
      error,
    } = await authClient.auth.getUser(match[1]);

    if (error || !user) {
      return res.status(401).json({ error: "Your session is invalid or expired." });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "nani-media-api" });
});

app.post(
  "/v1/media/photo",
  requireAuth,
  upload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file was supplied." });
      }

      // Don't write an object until its delivery URL can be provided.
      if (!publicBaseUrl) {
        return res.status(503).json({
          error: "Configure R2_PUBLIC_BASE_URL before uploading photos.",
        });
      }

      // Sharp parses the actual image and rejects invalid or corrupt files.
      const output = await sharp(req.file.buffer, {
        limitInputPixels: 80_000_000,
      })
        .rotate()
        .resize({
          width: 2048,
          height: 2048,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 82, effort: 4 })
        .toBuffer({ resolveWithObject: true });

      const key = `users/${req.user.id}/${randomUUID()}.webp`;

      await r2.send(
        new PutObjectCommand({
          Bucket: processedBucket,
          Key: key,
          Body: output.data,
          ContentType: "image/webp",
          CacheControl: "public, max-age=31536000, immutable",
        })
      );

      return res.status(201).json({
        key,
        url: makePublicUrl(key),
        contentType: "image/webp",
        bytes: output.info.size,
        width: output.info.width,
        height: output.info.height,
      });
    } catch (error) {
      next(error);
    }
  }
);

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    return res.status(status).json({
      error:
        status === 413
          ? "Image exceeds the 20 MB upload limit."
          : "Invalid file upload.",
    });
  }

  const status = Number(error.statusCode || 500);

  if (status >= 500) {
    console.error("Media API error:", error);
  }

  return res.status(status).json({
    error: status >= 500 ? "Media service error. Please try again." : error.message,
  });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`NaNi media API listening on port ${port}`);
});
