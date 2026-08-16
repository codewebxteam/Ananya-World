export const uploadToImageKitWithDetails = async (file: File): Promise<{ url: string; fileId: string } | null> => {
  try {
    const url = import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT || "https://upload.imagekit.io/api/v1/files/upload";
    const privateKey = import.meta.env.VITE_IMAGEKIT_PRIVATE_KEY || "private_0KCEHKUkVgSF9qCeQna5hMySe8k=";
    const authHeader = `Basic ${btoa(privateKey + ":")}`;

    let formData = new FormData();
    formData.append("file", file);
    formData.append("fileName", file.name);
    formData.append("publicKey", import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY || "public_A9rlT+XwJK8LIwidHJhuH6m945Y=");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Accept": "application/json"
      },
      body: formData
    });

    const data = await response.json();
    
    if (response.ok) {
      return { url: data.url, fileId: data.fileId };
    } else {
      console.error("ImageKit Upload Error:", data);
      return null;
    }
  } catch (error) {
    console.error("Error uploading to ImageKit:", error);
    return null;
  }
};

export const uploadToImageKit = async (file: File): Promise<string | null> => {
  const res = await uploadToImageKitWithDetails(file);
  return res ? res.url : null;
};

export const deleteFromImageKit = async (fileId: string): Promise<boolean> => {
  try {
    if (!fileId) return false;
    const privateKey = import.meta.env.VITE_IMAGEKIT_PRIVATE_KEY || "private_0KCEHKUkVgSF9qCeQna5hMySe8k=";
    const authHeader = `Basic ${btoa(privateKey + ":")}`;
    const response = await fetch(`https://api.imagekit.io/v1/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        Authorization: authHeader
      }
    });
    return response.ok;
  } catch (error) {
    console.error("Error deleting file from ImageKit:", error);
    return false;
  }
};
