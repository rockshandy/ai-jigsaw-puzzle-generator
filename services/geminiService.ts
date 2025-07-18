
import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // This will prevent the app from running if the API key is not set.
  // The environment is expected to provide this key.
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const generateImage = async (prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateImages({
      model: 'imagen-3.0-generate-002',
      prompt: `A beautiful, vibrant, high-detail image of: ${prompt}`,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/png',
        aspectRatio: '1:1', // Square aspect ratio simplifies grid slicing
      },
    });

    if (response.generatedImages && response.generatedImages.length > 0 && response.generatedImages[0].image.imageBytes) {
      return response.generatedImages[0].image.imageBytes;
    } else {
      throw new Error("Image generation failed, no images were returned by the API.");
    }
  } catch (error) {
    console.error("Error generating image with Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to generate image: ${error.message}`);
    }
    throw new Error("An unknown error occurred during image generation.");
  }
};
