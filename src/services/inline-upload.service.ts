import { apiClient } from "@/lib/api-client";

/**
 * Talks to the generic inline-image upload endpoint
 * (`App\Http\Controllers\InlineUploadController`) used by `RichTextComposer`
 * when an image is pasted or dropped directly into a comment/update draft —
 * these images are part of the message body, not a comment attachment.
 */
export const inlineUploadService = {
  /** POST /api/uploads/inline-images */
  async uploadImage(file: File): Promise<string> {
    const form_data = new FormData();
    form_data.append("image", file);

    const response = await apiClient.postFormData<{ data: { url: string } }>(
      "/api/uploads/inline-images",
      form_data
    );
    return response.data.url;
  },
};
