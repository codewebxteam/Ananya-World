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

// Resolve MIME type from file extension
const getMimeType = (ext: string): string => {
  switch (ext) {
    case 'pdf': return 'application/pdf';
    case 'png': return 'image/png';
    case 'jpg': case 'jpeg': return 'image/jpeg';
    case 'gif': return 'image/gif';
    case 'mp4': return 'video/mp4';
    case 'mov': return 'video/quicktime';
    case 'm4v': return 'video/x-m4v';
    case 'avi': return 'video/x-msvideo';
    case 'doc': return 'application/msword';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xls': return 'application/vnd.ms-excel';
    case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'txt': return 'text/plain';
    default: return 'application/octet-stream';
  }
};

// ============================================================================
// STRATEGY A: Native XHR Multipart File Upload
// Uses React Native's built-in XMLHttpRequest to stream the file directly from
// its URI via OkHttp (Android) / NSURLSession (iOS). This completely bypasses
// Expo Go's broken FileSystem module AND Expo's winter/fetch polyfill.
// The key: FormData.append('file', { uri, name, type }) tells React Native's
// native networking layer to open and stream the file itself.
// ============================================================================
const uploadViaXhrMultipart = (
  fileUri: string,
  cleanFileName: string,
  mimeType: string,
  authHeader: string
): Promise<{ url: string; fileId: string }> => {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    // React Native's FormData natively supports file objects with { uri, name, type }
    formData.append('file', {
      uri: fileUri,
      name: cleanFileName,
      type: mimeType,
    } as any);
    formData.append('fileName', cleanFileName);
    formData.append('publicKey', IMAGEKIT_PUBLIC_KEY);

    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ url: data.url, fileId: data.fileId });
        } else {
          reject(new Error(`Server error ${xhr.status}: ${JSON.stringify(data)}`));
        }
      } catch (e) {
        reject(new Error(`Response parse error: ${xhr.responseText?.substring(0, 200)}`));
      }
    };
    xhr.onerror = () => reject(new Error('XHR network error'));
    xhr.ontimeout = () => reject(new Error('XHR timeout'));
    xhr.timeout = 120000; // 2 minutes timeout
    xhr.open('POST', IMAGEKIT_URL_ENDPOINT, true);
    xhr.setRequestHeader('Authorization', authHeader);
    xhr.send(formData);
  });
};

export const uploadToImageKitWithDetails = async (fileUri: string, fileName: string): Promise<{ url: string; fileId: string } | null> => {
  let tempUri: string | null = null;
  try {
    if (!IMAGEKIT_URL_ENDPOINT || !IMAGEKIT_PRIVATE_KEY || !IMAGEKIT_PUBLIC_KEY) {
      console.error('[ImageKit] Config missing.');
      return null;
    }

    const authHeader = `Basic ${Base64.btoa(IMAGEKIT_PRIVATE_KEY + ":")}`;
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const ext = cleanFileName.split('.').pop()?.toLowerCase() || '';
    const mimeType = getMimeType(ext);

    // Build list of URIs to try (original first, then decoded)
    const urisToTry = [fileUri];
    const decodedUri = decodeURIComponent(fileUri);
    if (decodedUri !== fileUri) urisToTry.push(decodedUri);

    // ====== STRATEGY 1: XHR Native Multipart Upload ======
    // Streams the file directly from its URI through React Native's native
    // networking layer (OkHttp on Android). NO file reading, NO blob creation.
    for (const uri of urisToTry) {
      try {
        console.log('[ImageKit] Strategy 1 - XHR multipart:', uri.substring(0, 80));
        const result = await uploadViaXhrMultipart(uri, cleanFileName, mimeType, authHeader);
        console.log('[ImageKit] XHR multipart success!');
        return result;
      } catch (err: any) {
        console.warn('[ImageKit] XHR multipart failed:', err?.message);
      }
    }

    // ====== STRATEGY 2: FileSystem.readAsStringAsync + Base64 ======
    for (const uri of urisToTry) {
      try {
        console.log('[ImageKit] Strategy 2 - FileSystem Base64:', uri.substring(0, 80));
        const base64Data = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const base64WithHeader = `data:${mimeType};base64,${base64Data}`;
        const formData = new FormData();
        formData.append('file', base64WithHeader);
        formData.append('fileName', cleanFileName);
        formData.append('publicKey', IMAGEKIT_PUBLIC_KEY);

        const res = await fetch(IMAGEKIT_URL_ENDPOINT, {
          method: 'POST',
          headers: { Authorization: authHeader },
          body: formData,
        });

        const data = await res.json();
        if (res.status >= 200 && res.status < 300) {
          console.log('[ImageKit] FileSystem Base64 upload success!');
          return { url: data.url, fileId: data.fileId };
        } else {
          console.error('[ImageKit] Base64 server error:', data);
        }
      } catch (err: any) {
        console.warn('[ImageKit] FileSystem.readAsStringAsync failed:', err?.message);
      }
    }

    // ====== STRATEGY 3: FileSystem.uploadAsync (binary multipart) ======
    for (const uri of urisToTry) {
      try {
        console.log('[ImageKit] Strategy 3 - uploadAsync:', uri.substring(0, 80));
        let uploadUri = uri;

        try {
          tempUri = `${FileSystem.cacheDirectory}upload_${Date.now()}_${cleanFileName}`;
          await FileSystem.copyAsync({ from: uri, to: tempUri });
          uploadUri = tempUri;
        } catch (_) {
          uploadUri = uri;
        }

        const response = await FileSystem.uploadAsync(IMAGEKIT_URL_ENDPOINT, uploadUri, {
          fieldName: 'file',
          httpMethod: 'POST',
          uploadType: 1 as any,
          headers: { Authorization: authHeader },
          parameters: {
            fileName: cleanFileName,
            publicKey: IMAGEKIT_PUBLIC_KEY,
          },
        });

        const data = JSON.parse(response.body);
        if (tempUri) FileSystem.deleteAsync(tempUri, { idempotent: true }).catch(() => {});

        if (response.status >= 200 && response.status < 300) {
          console.log('[ImageKit] Binary uploadAsync success!');
          return { url: data.url, fileId: data.fileId };
        } else {
          console.error('[ImageKit] Binary server error:', data);
        }
      } catch (uploadError: any) {
        console.warn('[ImageKit] uploadAsync failed:', uploadError?.message);
      }
    }
  } catch (error) {
    console.error('[ImageKit] Fatal error:', error);
  }
  if (tempUri) FileSystem.deleteAsync(tempUri, { idempotent: true }).catch(() => {});
  return null;
};

// Direct base64 upload - bypasses ALL file system reads.
// Use when you already have base64 data (e.g. from ImagePicker with base64:true).
export const uploadBase64ToImageKit = async (base64Data: string, fileName: string, mimeType: string = 'image/jpeg'): Promise<{ url: string; fileId: string } | null> => {
  try {
    if (!IMAGEKIT_URL_ENDPOINT || !IMAGEKIT_PRIVATE_KEY || !IMAGEKIT_PUBLIC_KEY) {
      console.error('[ImageKit] Config missing.');
      return null;
    }
    const authHeader = `Basic ${Base64.btoa(IMAGEKIT_PRIVATE_KEY + ":")}`;
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    const formData = new FormData();
    formData.append('file', dataUrl);
    formData.append('fileName', cleanFileName);
    formData.append('publicKey', IMAGEKIT_PUBLIC_KEY);

    const res = await fetch(IMAGEKIT_URL_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: authHeader },
      body: formData,
    });

    const data = await res.json();
    if (res.status >= 200 && res.status < 300) {
      console.log('[ImageKit] Direct base64 upload success!');
      return { url: data.url, fileId: data.fileId };
    } else {
      console.error('[ImageKit] Direct base64 server error:', data);
    }
  } catch (error) {
    console.error('[ImageKit] Direct base64 upload failed:', error);
  }
  return null;
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
