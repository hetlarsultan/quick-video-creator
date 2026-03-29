import { ProjectType } from './storage';

export const featureCards = [
  { id: 'text-to-video', title: 'تحويل النص إلى فيديو', subtitle: 'أنشئ فيديوهات احترافية من وصف قصير.', icon: 'Video', type: 'text-to-video' as ProjectType },
  { id: 'image-to-video', title: 'تحويل الصور إلى فيديو', subtitle: 'حرّك الصور مع انتقالات ذكية.', icon: 'ImageIcon', type: 'image-to-video' as ProjectType },
  { id: 'text-to-image', title: 'تحويل النص إلى صور', subtitle: 'نتائج واقعية وفنية في ثوانٍ.', icon: 'Palette', type: 'text-to-image' as ProjectType },
  { id: 'scene-generator', title: 'إنشاء بيئات ومشاهد', subtitle: 'مولد تلقائي لمشاهد الفيديو.', icon: 'Globe', type: 'scene-generator' as ProjectType },
  { id: 'text-to-audio', title: 'تحويل النص إلى صوت', subtitle: 'أصوات عربية طبيعية وواضحة.', icon: 'Mic', type: 'text-to-audio' as ProjectType },
];

export const styleOptions = ['سينمائي', 'واقعي', 'أنيمي', 'ثلاثي الأبعاد', 'مينيمال'];
export const durationOptions = [5, 10, 15, 30];

export const quickPrompts = [
  'فيديو ترويجي لمقهى عصري في الرياض',
  'مشهد غروب فوق بحر هادئ مع موسيقى ناعمة',
  'تصميم شخصية كرتونية لبطل لعبة',
  'مقطع تحفيزي لرياضي يبدأ تدريبه صباحاً',
];

export const chatSuggestions = [
  'أقترح لي فكرة فيديو منتج جديد',
  'كيف أحسّن جودة الفيديو؟',
  'اكتب سكريبت قصير لفيديو إعلان',
];
