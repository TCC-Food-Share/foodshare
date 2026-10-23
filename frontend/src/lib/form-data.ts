type FormValue = string | number | boolean | null | undefined | FormValues;
interface FormValues {
  [key: string]: FormValue;
}

function append(formData: FormData, key: string, value: FormValue) {
  if (value === undefined || value === null || value === '') return;
  if (typeof value === 'object') {
    for (const [childKey, childValue] of Object.entries(value)) {
      append(formData, `${key}[${childKey}]`, childValue);
    }
    return;
  }
  formData.append(key, String(value));
}

export function toFormData(values: object, files: Record<string, File | null | undefined> = {}) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values as FormValues)) {
    append(formData, key, value);
  }
  for (const [key, file] of Object.entries(files)) {
    if (file) formData.append(key, file);
  }
  return formData;
}
