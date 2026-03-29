import { ProjectType } from './storage';

export const featureCards = [
  { id: 'text-to-video', title: 'تحويل النص إلى فيديو', subtitle: 'أنشئ فيديوهات احترافية من وصف قصير.', icon: 'Video', type: 'text-to-video' as ProjectType, gradient: 'gradient-primary' },
  { id: 'image-to-video', title: 'تحويل الصور إلى فيديو', subtitle: 'حرّك الصور مع انتقالات ذكية.', icon: 'ImageIcon', type: 'image-to-video' as ProjectType, gradient: 'gradient-warm' },
  { id: 'text-to-image', title: 'تحويل النص إلى صور', subtitle: 'نتائج واقعية وفنية في ثوانٍ.', icon: 'Palette', type: 'text-to-image' as ProjectType, gradient: 'gradient-success' },
  { id: 'scene-generator', title: 'إنشاء بيئات ومشاهد', subtitle: 'مولد تلقائي لمشاهد الفيديو.', icon: 'Globe', type: 'scene-generator' as ProjectType, gradient: 'gradient-sunset' },
  { id: 'text-to-audio', title: 'تحويل النص إلى صوت', subtitle: 'أصوات عربية طبيعية وواضحة.', icon: 'Mic', type: 'text-to-audio' as ProjectType, gradient: 'gradient-primary' },
];

export const templates = [
  { id: 't1', title: 'إعلان منتج', prompt: 'فيديو إعلاني قصير لمنتج تجميلي فاخر مع إضاءة ناعمة وموسيقى هادئة', type: 'text-to-video' as ProjectType, duration: 15, style: 'سينمائي', emoji: '💄' },
  { id: 't2', title: 'مقدمة يوتيوب', prompt: 'مقدمة احترافية لقناة يوتيوب تقنية مع تأثيرات ثلاثية الأبعاد', type: 'text-to-video' as ProjectType, duration: 5, style: 'ثلاثي الأبعاد', emoji: '🎬' },
  { id: 't3', title: 'قصة إنستغرام', prompt: 'تصميم قصة إنستغرام لمطعم مع صور أطباق شهية وألوان دافئة', type: 'text-to-image' as ProjectType, duration: 10, style: 'واقعي', emoji: '📱' },
  { id: 't4', title: 'بودكاست', prompt: 'مقدمة صوتية لبودكاست عربي عن التقنية والابتكار', type: 'text-to-audio' as ProjectType, duration: 10, style: 'مينيمال', emoji: '🎙️' },
  { id: 't5', title: 'عرض عقاري', prompt: 'جولة افتراضية داخل فيلا فاخرة مع إطلالة بحرية وتصميم حديث', type: 'text-to-video' as ProjectType, duration: 30, style: 'سينمائي', emoji: '🏠' },
  { id: 't6', title: 'شعار متحرك', prompt: 'تحريك شعار شركة تقنية ناشئة مع تأثير ظهور أنيق', type: 'text-to-video' as ProjectType, duration: 5, style: 'مينيمال', emoji: '✨' },
];

export const styleOptions = ['سينمائي', 'واقعي', 'أنيمي', 'ثلاثي الأبعاد', 'مينيمال'];
export const durationOptions = [5, 10, 15, 30, 60];

export const quickPrompts = [
  'فيديو ترويجي لمقهى عصري في الرياض',
  'مشهد غروب فوق بحر هادئ مع موسيقى ناعمة',
  'تصميم شخصية كرتونية لبطل لعبة',
  'مقطع تحفيزي لرياضي يبدأ تدريبه صباحاً',
  'فيديو تعليمي عن الذكاء الاصطناعي بأسلوب بسيط',
  'إعلان لمتجر إلكتروني مع عروض مميزة',
];

export const chatSuggestions = [
  'أقترح لي فكرة فيديو منتج جديد',
  'كيف أحسّن جودة الفيديو؟',
  'اكتب سكريبت قصير لفيديو إعلان',
  'ما أفضل طابع لفيديو تحفيزي؟',
];

export const tips = [
  { title: 'اكتب وصفاً مفصّلاً', desc: 'كلما كان الوصف أوضح، كانت النتيجة أفضل.' },
  { title: 'اختر الطابع المناسب', desc: 'الطابع السينمائي رائع للإعلانات والأنيمي للمحتوى الإبداعي.' },
  { title: 'استخدم القوالب', desc: 'ابدأ من قالب جاهز وعدّله حسب احتياجك.' },
];
