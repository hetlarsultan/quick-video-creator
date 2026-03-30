import { supabase } from '@/integrations/supabase/client';

export interface GenerateImageResult {
  imageUrl: string;
  description: string;
}

export async function generateImage(prompt: string, style?: string): Promise<GenerateImageResult> {
  const { data, error } = await supabase.functions.invoke('generate-image', {
    body: { prompt, style },
  });

  if (error) {
    console.error('Edge function error:', error);
    throw new Error(error.message || 'فشل في الاتصال بخدمة الذكاء الاصطناعي');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  if (!data?.imageUrl) {
    throw new Error('لم يتم إنتاج صورة');
  }

  return {
    imageUrl: data.imageUrl,
    description: data.description || '',
  };
}
