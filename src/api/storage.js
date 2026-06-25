import { getSupabase, unwrap } from "./_utils";

const BUCKET = "comprovantes";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = {
  "application/pdf": "PDF",
  "image/png": "PNG",
  "image/jpeg": "JPEG",
  "image/jpg": "JPG",
};

export function validateFile(file) {
  const errors = [];

  if (!file) {
    errors.push("Nenhum arquivo selecionado");
    return { valid: false, errors };
  }

  if (file.size > MAX_FILE_SIZE) {
    errors.push(`Tamanho máximo de arquivo é 10MB. Seu arquivo tem ${(file.size / 1024 / 1024).toFixed(2)}MB`);
  }

  if (!Object.keys(ALLOWED_TYPES).includes(file.type)) {
    errors.push(`Formato de arquivo não permitido. Use PDF, PNG ou JPEG/JPG.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    fileType: ALLOWED_TYPES[file.type],
  };
}

export async function ensureComprovantesBucket() {
  // Frontend can't create buckets - bucket must be created manually in Supabase Dashboard!
  const sb = getSupabase();
  try {
    const { data: buckets, error: listError } = await sb.storage.listBuckets();
    if (listError) {
      console.warn("Error listing buckets:", listError);
      return true; // Assume it exists to let upload proceed
    }
    const exists = (buckets || []).some((b) => b.name === BUCKET);
    if (!exists) {
      console.error(`Bucket '${BUCKET}' not found! Please create it in Supabase Dashboard.`);
    }
    return exists;
  } catch (err) {
    console.warn("Error checking bucket:", err);
    return true; // Assume it exists to let upload proceed
  }
}

export async function uploadComprovante({ file, viagemId, prefix = "" }) {
  const sb = getSupabase();
  try {
    const { data: userData } = await sb.auth.getUser();
    console.log(
      "Uploading as:",
      userData.user?.email,
      userData.user?.id
    );
  } catch (e) {
    console.warn("Could not get user for logging upload:", e);
  }
  
  console.debug('[Storage] Starting upload:', { fileName: file.name, fileType: file.type, fileSize: file.size, viagemId });

  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.errors.join(", "));
  }

  const safePrefix = prefix ? `${prefix.replace(/\/+$/g, "")}/` : "";
  const safeName = `${Date.now()}-${file.name}`.replace(/[^\w.\-]+/g, "_");
  const path = `${safePrefix}${viagemId ? `viagens/${viagemId}/` : ""}${safeName}`;
  
  console.debug('[Storage] Uploading to path:', path);

  const upload = await sb.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  
  if (upload.error) {
    console.error('[Storage] Upload failed:', upload.error);
    throw upload.error;
  }
  
  console.debug('[Storage] Upload successful!');

  console.log({
  bucket: BUCKET,
  path,
  });

  const pub = sb.storage.from(BUCKET).getPublicUrl(path);
  if (pub.error) throw pub.error;
  
  console.debug('[Storage] Public URL:', pub.data.publicUrl);
  return { path, publicUrl: pub.data.publicUrl, fileType: validation.fileType };
}

export async function removeComprovante(path) {
  const q = getSupabase().storage.from(BUCKET).remove([path]);
  return unwrap(await q);
}

export async function getPublicUrl(path) {
  const sb = getSupabase();
  const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export { BUCKET, MAX_FILE_SIZE, ALLOWED_TYPES };