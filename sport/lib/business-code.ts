/** ID bisnis ditampilkan 4-4 supaya mudah dibaca dan diketik; kolom masuk menerima dengan atau tanpa tanda hubung. */
export const formatBusinessCode = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`;
