export function uploadError(status, result) {
  if (status === 413) return 'Upload ditolak karena batas ukuran di server/hosting (HTTP 413). Periksa batas upload proxy, atau coba file yang lebih kecil.';
  if (status === 401) return 'Sesi admin berakhir. Masuk kembali sebelum mengunggah musik atau gambar.';
  if (result?.error && typeof result.error === 'string') return result.error;
  if ([408, 502, 503, 504].includes(status)) return `Server upload tidak merespons atau melewati batas waktu (HTTP ${status}). Periksa koneksi Cloudinary dan timeout hosting.`;
  if (status === 403) return 'Upload ditolak (HTTP 403). Periksa APP_ORIGIN dan sesi admin, lalu muat ulang halaman.';
  return `Upload belum berhasil (HTTP ${status}). Periksa log aplikasi atau hosting.`;
}
