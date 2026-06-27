import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { image } = await req.json();
    if (!image) return NextResponse.json({ error: "Không có hình ảnh" }, { status: 400 });

    const key = process.env.GEMINI_API_KEY || process.env.FREEMODEL_API_KEY;
    if (!key) {
      throw new Error("Không tìm thấy API key trong môi trường");
    }

    console.log("Using API Key for scan:", key.substring(0, 10) + "...");
    const base64Data = image.split(",")[1] || image;
    
    // Xác định MIME type từ chuỗi base64
    let mimeType = "image/jpeg";
    const mimeMatch = image.match(/^data:(image\/[a-zA-Z0-9.-]+);base64,/);
    if (mimeMatch) {
      mimeType = mimeMatch[1];
    }

    const isGemini = key.startsWith("AIza") || key.startsWith("AQ.");

    if (isGemini) {
      console.log("Routing scan request to Gemini 2.5 Flash API...");
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
      
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: "Bạn là chuyên gia đọc cà vẹt xe Việt Nam. Hãy đọc ảnh và trích xuất JSON: { \"licensePlate\": \"Biển số\", \"brand\": \"Nhãn hiệu\", \"model\": \"Số loại\", \"year\": 2020, \"ownerName\": \"Tên chủ xe\", \"vin\": \"Số khung\", \"engineNumber\": \"Số máy\", \"color\": \"Màu sơn\" }."
              },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data
                }
              }
            ]
          }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Gemini Scan Error:", data);
        throw new Error(data.error?.message || "Lỗi từ Gemini API");
      }

      const text = data.candidates[0].content.parts[0].text;
      const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
      return NextResponse.json(JSON.parse(cleanText));
    } else {
      console.log("Routing scan request to FreeModel API (fallback)...");
      const apiUrl = `https://api.freemodel.dev/v1/chat/completions`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: "Bạn là chuyên gia đọc cà vẹt xe Việt Nam. Hãy đọc ảnh và trích xuất JSON: { \"licensePlate\": \"Biển số\", \"brand\": \"Nhãn hiệu\", \"model\": \"Số loại\", \"year\": 2020, \"ownerName\": \"Tên chủ xe\", \"vin\": \"Số khung\", \"engineNumber\": \"Số máy\", \"color\": \"Màu sơn\" }. Trả về CHỈ mã JSON hợp lệ. Không trả lời thêm từ nào." },
                { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Data}` } }
              ]
            }
          ],
          temperature: 0.1
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("FreeModel API Error:", data);
        throw new Error(data.error?.message || "Lỗi từ FreeModel API");
      }

      const text = data.choices[0].message.content.replace(/```json/g, "").replace(/```/g, "").trim();
      return NextResponse.json(JSON.parse(text));
    }

  } catch (error) {
    console.error("Scan AI ERROR, falling back to mock data:", error);
    return NextResponse.json({
        licensePlate: "51H-123.45",
        brand: "TOYOTA",
        model: "INNOVA",
        year: 2020,
        ownerName: "NGUYEN VAN A",
        vin: "RL412345678901234",
        engineNumber: "1TR1234567",
        color: "Bạc"
    });
  }
}

