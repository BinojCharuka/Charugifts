import { NextRequest, NextResponse } from "next/server";
import { cloudinary } from "@/lib/cloudinary";
import { createWorker } from "tesseract.js";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const referenceCode = formData.get("referenceCode") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Start Cloudinary upload immediately
    const uploadPromise = new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "lumina-gifts",
          resource_type: "auto",
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    if (referenceCode) {
      console.log(`Running OCR for reference code: ${referenceCode}`);
      
      // Perform OCR in parallel with cachePath for Vercel tmp dir
      const ocrPromise = (async () => {
        const worker = await createWorker("eng", 1, {
          cachePath: "/tmp",
          logger: m => console.log(m.status, m.progress) // optional, to see it in logs
        });
        const ret = await worker.recognize(buffer);
        await worker.terminate();
        return ret.data.text;
      })();

      const [uploadResult, ocrText] = await Promise.all([uploadPromise, ocrPromise]);

      console.log("OCR Extracted Text:", ocrText);
      
      const normalizedText = ocrText.replace(/[\s-]/g, "").toUpperCase();
      const normalizedCode = referenceCode.replace(/[\s-]/g, "").toUpperCase();
      
      if (!normalizedText.includes(normalizedCode)) {
        // OCR verification failed, delete the image from Cloudinary to prevent orphans
        if (uploadResult.public_id) {
          await cloudinary.uploader.destroy(uploadResult.public_id);
        }
        return NextResponse.json({ 
          error: `Could not verify payment slip. Please make sure the remark "${referenceCode}" is clearly visible on the receipt.` 
        }, { status: 400 });
      }

      return NextResponse.json({ url: uploadResult.secure_url });
    } else {
      // If no reference code provided, just wait for upload
      const uploadResult = await uploadPromise;
      return NextResponse.json({ url: uploadResult.secure_url });
    }
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message || "Failed to upload file" }, { status: 500 });
  }
}
