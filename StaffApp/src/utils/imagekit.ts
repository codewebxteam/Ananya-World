// imagekit.ts
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
const Base64 = {
  btoa: (input: string = '') => {
    let str = input;
    let output = '';
    for (let block = 0, charCode, i = 0, map = chars; str.charAt(i | 0) || (map = '=', i % 1); output += map.charAt(63 & block >> 8 - i % 1 * 8)) {
      charCode = str.charCodeAt(i += 3 / 4);
      if (charCode > 0xFF) {
        throw new Error("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
      }
      block = block << 8 | charCode;
    }
    return output;
  }
};

import * as FileSystem from 'expo-file-system/legacy';

// Read ImageKit config from environment variables (.env)
const IMAGEKIT_URL_ENDPOINT = process.env.EXPO_PUBLIC_IMAGEKIT_URL_ENDPOINT || '';
const IMAGEKIT_PUBLIC_KEY = process.env.EXPO_PUBLIC_IMAGEKIT_PUBLIC_KEY || '';
const IMAGEKIT_PRIVATE_KEY = process.env.EXPO_PUBLIC_IMAGEKIT_PRIVATE_KEY || '';

export const uploadToImageKitWithDetails = async (fileUri: string, fileName: string): Promise<{ url: string; fileId: string } | null> => {
  let tempUri: string | null = null;
  try {
    if (!IMAGEKIT_URL_ENDPOINT || !IMAGEKIT_PRIVATE_KEY || !IMAGEKIT_PUBLIC_KEY) {
      console.error('ImageKit config missing. Please set EXPO_PUBLIC_IMAGEKIT_URL_ENDPOINT, EXPO_PUBLIC_IMAGEKIT_PUBLIC_KEY, and EXPO_PUBLIC_IMAGEKIT_PRIVATE_KEY in your .env file.');
      return null;
    }

    const authHeader = `Basic ${Base64.btoa(IMAGEKIT_PRIVATE_KEY + ":")}`;

    let uploadUri = fileUri;

    // Safely copy URI if it's from cache/DocumentPicker to guarantee read permission on Android & iOS
    try {
      const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      tempUri = `${FileSystem.cacheDirectory}upload_${Date.now()}_${cleanFileName}`;
      await FileSystem.copyAsync({ from: fileUri, to: tempUri });
      uploadUri = tempUri;
    } catch (e) {
      uploadUri = fileUri;
    }

    try {
      const response = await FileSystem.uploadAsync(IMAGEKIT_URL_ENDPOINT, uploadUri, {
        fieldName: 'file',
        httpMethod: 'POST',
        uploadType: 1 as any, // 1 maps to MULTIPART in expo-file-system
        headers: {
          Authorization: authHeader,
        },
        parameters: {
          fileName: fileName,
          publicKey: IMAGEKIT_PUBLIC_KEY,
        },
      });

      const data = JSON.parse(response.body);
      
      if (response.status >= 200 && response.status < 300) {
        if (tempUri) FileSystem.deleteAsync(tempUri, { idempotent: true }).catch(() => {});
        return { url: data.url, fileId: data.fileId };
      }
    } catch (uploadError) {
      console.warn("FileSystem.uploadAsync failed, attempting FormData fallback:", uploadError);
    }

    // Fallback to FormData upload
    const formData = new FormData();
    formData.append('file', {
      uri: uploadUri,
      name: fileName,
      type: fileName.endsWith('.mp4') ? 'video/mp4' : fileName.endsWith('.png') ? 'image/png' : fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
    } as any);
    formData.append('fileName', fileName);
    formData.append('publicKey', IMAGEKIT_PUBLIC_KEY);

    const res = await fetch(IMAGEKIT_URL_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
      },
      body: formData,
    });

    const data = await res.json();
    if (tempUri) FileSystem.deleteAsync(tempUri, { idempotent: true }).catch(() => {});

    if (res.ok && data.url) {
      return { url: data.url, fileId: data.fileId };
    } else {
      console.error("ImageKit Upload Error:", data);
      return null;
    }
  } catch (error) {
    console.error("Error uploading to ImageKit:", error);
    if (tempUri) FileSystem.deleteAsync(tempUri, { idempotent: true }).catch(() => {});
    return null;
  }
};

export const uploadToImageKit = async (fileUri: string, fileName: string): Promise<string | null> => {
  const result = await uploadToImageKitWithDetails(fileUri, fileName);
  return result ? result.url : null;
};

export const deleteFromImageKit = async (fileId: string): Promise<boolean> => {
  try {
    if (!fileId) return false;
    if (!IMAGEKIT_PRIVATE_KEY) {
      console.error('ImageKit private key missing. Set EXPO_PUBLIC_IMAGEKIT_PRIVATE_KEY in .env.');
      return false;
    }
    const authHeader = `Basic ${Base64.btoa(IMAGEKIT_PRIVATE_KEY + ":")}`;
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
