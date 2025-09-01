export type Localizer = (k: string) => string;

export function statusText(t: Localizer, status?: string) {
  switch (status) {
    case 'compressing': return t('status.compressing');
    case 'uploading-image': return t('status.uploadingImage');
    case 'creating-metadata': return t('status.creatingMetadata');
    case 'uploading-metadata': return t('status.uploadingMetadata');
    case 'minting': return t('status.minting');
    case 'success': return t('status.success');
    case 'error': return t('status.error');
    default: return '';
  }
}
