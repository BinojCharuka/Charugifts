import { NextRequest, NextResponse } from "next/server";
import { cloudinary } from "@/lib/cloudinary";
import Tesseract from "tesseract.js";

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

    if (referenceCode) {
      console.log(`Running OCR for reference code: ${referenceCode}`);
      // Perform OCR
      const { data: { text } } = await Tesseract.recognize(buffer, "eng");
      console.log("OCR Extracted Text:", text);
      
      const normalizedText = text.replace(/[\s-]/g, "").toUpperCase();
      const normalizedCode = referenceCode.replace(/[\s-]/g, "").toUpperCase();
      
      if (!normalizedText.includes(normalizedCode)) {
        return NextResponse.json({ 
          error: `Could not verify payment slip. Please make sure the remark "${referenceCode}" is clearly visible on the receipt.` 
        }, { status: 400 });
      }
    }

    const result = await new Promise<any>((resolve, reject) => {
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

    return NextResponse.json({ url: result.secure_url });
  } catch (error: any) {
    console.error("Cloudinary upload error:", error);
    return NextResponse.json({ error: error.message || "Failed to upload file" }, { status: 500 });
  }
}
