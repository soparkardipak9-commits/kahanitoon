import "dotenv/config";
import express from "express";
import multer from "multer";
import Replicate from "replicate";

const app = express();
const PORT = process.env.PORT || 3000;

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 1
  }
});

app.use(express.json());
app.use(express.static("public"));

const styles = {
  "Cartoon":
    "bright 2D cartoon animation, colorful, expressive characters, clean outlines, family friendly",
  "3D Animation":
    "high quality 3D animated movie style, expressive characters, cinematic lighting, family friendly",
  "Anime":
    "beautiful anime animation, expressive characters, cinematic composition, family friendly",
  "Storybook":
    "magical illustrated storybook animation, warm colors, hand painted textures, family friendly"
};

app.post("/api/generate-video", upload.single("photo"), async (req, res) => {
  try {
    if (!process.env.REPLICATE_API_TOKEN) {
      return res.status(500).json({
        error: "Replicate API key backend mein set nahi hai."
      });
    }

    const story = String(req.body.story || "").trim();
    const style = String(req.body.style || "Cartoon");
    const voice = String(req.body.voice || "Female Narrator");

    if (!story) {
      return res.status(400).json({
        error: "Pehle story enter karein."
      });
    }

    const visualStyle = styles[style] || styles.Cartoon;

    const prompt = `
${visualStyle}.

Create a cinematic short video scene based on this Hindi story.

Story:
${story.slice(0, 3500)}

Important:
- Keep characters visually consistent
- Family friendly
- No subtitles
- No text on screen
- No logos
- No watermark

Narrator preference:
${voice}
`;

    let output;

    if (req.file) {
      const mime = req.file.mimetype || "image/jpeg";

      const imageData =
        `data:${mime};base64,` +
        req.file.buffer.toString("base64");

      output = await replicate.run(
        "wavespeedai/wan-2.1-i2v-480p",
        {
          input: {
            image: imageData,
            prompt: prompt,
            num_frames: 81,
            aspect_ratio: "16:9"
          }
        }
      );
    } else {
      output = await replicate.run(
        "wan-video/wan-2.1-1.3b",
        {
          input: {
            prompt: prompt,
            frame_num: 81,
            resolution: "480p",
            aspect_ratio: "16:9"
          }
        }
      );
    }

    let videoUrl;

    if (output && typeof output.url === "function") {
      videoUrl = output.url();
    } else if (
      Array.isArray(output) &&
      output[0] &&
      typeof output[0].url === "function"
    ) {
      videoUrl = output[0].url();
    } else {
      videoUrl = String(output);
    }

    res.json({
      success: true,
      videoUrl: videoUrl
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: error.message || "Video generation failed."
    });
  }
});

app.get("*", (req, res) => {
  res.sendFile(
    new URL("./public/index.html", import.meta.url).pathname
  );
});

app.listen(PORT, () => {
  console.log(`KahaniToon server running on port ${PORT}`);
});
