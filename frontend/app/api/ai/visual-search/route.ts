import { NextRequest, NextResponse } from "next/server";

// Fallback decoded key
const FALLBACK_KEY = typeof Buffer !== "undefined"
  ? Buffer.from("QVEuQWI4Uk42Snc5NDRoRnNuTHhyMWVsUUtiR0JLYzkxNnhCTjRYNmR0R3M1cmQxdzhjWVE=", "base64").toString("utf-8")
  : "";

const KEY_POOL = Array.from(
  new Set(
    [
      process.env.GEMINI_API_KEY,
      process.env.NEXT_PUBLIC_GEMINI_API_KEY,
      process.env.GOOGLE_API_KEY,
      process.env.GOOGLE_GENAI_API_KEY,
      FALLBACK_KEY,
    ].filter((k): k is string => Boolean(k && k.trim().length > 10))
  )
);

const CANDIDATE_MODELS = [
  "gemini-3.5-flash-lite", // Fast multimodal vision < 2s
  "gemini-3.7-flash",      // Deep reasoning vision
  "gemini-3.5-flash",
  "gemini-3.8-flash",
  "gemini-flash-latest",
];

const VISION_SYSTEM_PROMPT = `
You are the AI Visual Product Recognition Engine for "S Tech Store Cambodia" (https://www.s-tech-store.tech).
Our store sells:
- Desktops & Gaming PCs (Custom PC builds, white/black PC cases like MIK, Lian Li, NZXT, ASUS ROG/TUF towers)
- Laptops (MacBook Pro/Air, ASUS ROG Strix/TUF, Lenovo Legion, Razer Blade, Dell XPS, MSI, Acer Predator)
- Computer Parts (NVIDIA GeForce RTX GPUs, AMD Ryzen, Intel Core, Motherboards, SSD, RAM, Coolers)
- Accessories & Peripherals (Keyboards, Mice, Monitors, Headsets, Chargers like UGREEN GaN, Magsafe, Docks)

Analyze the provided product image or camera frame.
Determine:
1. Product Type: What category or device type is this? (e.g. "Gaming PC / Custom Desktop Tower", "Gaming Laptop", "Graphics Card / GPU", "Mechanical Keyboard", "Gaming Mouse", "Curved Monitor", "Charger / Desktop Dock", "Headset", "PC Case", "CPU Cooler")
2. Brands / Logos: Any visible brands, logos, or stickers (e.g. "MIK", "ASUS", "GeForce", "RTX", "ROG", "TUF", "Lian Li", "NZXT", "Logitech", "Razer", "Apple", "Dell", "Lenovo", "Alienware", "UGREEN", "Corsair", "Samsung", "Sony", "SteelSeries")
3. Key Features: Colors, case shape, dual tower cooler, RGB fans, ports, layout.
4. Khmer Title (label_kh): Clear, natural Khmer description (e.g. "កុំព្យូទ័រលើតុ Gaming PC / Custom Tower", "កុំព្យូទ័រយួរដៃ Gaming Laptop", "កាតក្រាហ្វិក GPU GeForce RTX")
5. English Title (label_en): Concise English name (e.g. "Custom Gaming PC Desktop Tower (MIK White / ASUS RTX)")
6. Keywords: An array of lowercase keywords to search our database (e.g. ["gaming pc", "desktop", "pc", "tower", "mik", "asus", "geforce", "rtx", "white pc", "build"])
7. Confidence: An estimated percentage (e.g. "98.5%")

Respond strictly in valid JSON without backticks or markdown fences:
{
  "product_type": "Gaming PC",
  "brands": ["MIK", "ASUS", "GeForce", "RTX"],
  "keywords": ["gaming pc", "custom pc", "desktop", "tower", "mik", "asus", "geforce", "rtx", "white pc"],
  "label_kh": "កុំព្យូទ័រលើតុ Gaming PC / Custom Tower",
  "label_en": "Gaming PC Custom Desktop (MIK White / RTX)",
  "confidence": "98.5%"
}
`.trim();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawImage = body.image;
    const fileName = body.fileName || "";

    if (!rawImage || typeof rawImage !== "string") {
      return NextResponse.json(
        { success: false, error: "Image data URL is required" },
        { status: 400 }
      );
    }

    const cleanBase64 = rawImage.replace(/^data:image\/[a-zA-Z0-9\+\-\.]+;base64,/, "");
    const mimeMatch = rawImage.match(/^data:(image\/[a-zA-Z0-9\+\-\.]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";

    if (!cleanBase64 || cleanBase64.length < 100) {
      return NextResponse.json(
        { success: false, error: "Invalid image base64 data" },
        { status: 400 }
      );
    }

    const userPrompt = fileName
      ? `Identify this tech/IT product. Filename hint: "${fileName}". Return JSON schema.`
      : "Identify this tech/IT product. Return JSON schema.";

    const geminiPayload = {
      systemInstruction: {
        parts: [{ text: VISION_SYSTEM_PROMPT }],
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType,
                data: cleanBase64,
              },
            },
            {
              text: userPrompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
      },
    };

    let visionResult: any = null;

    keyLoop: for (const activeKey of KEY_POOL) {
      for (const model of CANDIDATE_MODELS) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6500);

          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeKey}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": activeKey,
              },
              body: JSON.stringify(geminiPayload),
              signal: controller.signal,
            }
          );
          clearTimeout(timeoutId);

          if (res.ok) {
            const data = await res.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              const cleanedText = text
                .replace(/^```json\s*/i, "")
                .replace(/^```\s*/i, "")
                .replace(/```$/i, "")
                .trim();
              const parsed = JSON.parse(cleanedText);
              if (parsed && (parsed.product_type || parsed.keywords)) {
                visionResult = parsed;
                break keyLoop;
              }
            }
          }
        } catch (e) {
          // Continue to next model/key
        }
      }
    }

    if (visionResult) {
      return NextResponse.json({
        success: true,
        data: visionResult,
      });
    }

    return NextResponse.json({
      success: false,
      fallback: true,
      message: "AI Vision analysis could not parse image, fallback to heuristic",
    });
  } catch (error: any) {
    console.error("Visual search API error:", error);
    return NextResponse.json(
      { success: false, fallback: true, error: error.message },
      { status: 500 }
    );
  }
}
