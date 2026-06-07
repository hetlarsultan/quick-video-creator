## الهدف
تحسين تجربة Veo (استئناف/ETA/تحديد معدل عبر السحابة/سجل أحداث) + تفعيل المعاينة بدمج صوت وزر تحميل للناتج المدموج.

## 1. استئناف Veo التلقائي عند انقطاع الشبكة (نفس الجلسة)
- في `src/lib/ai.ts`:
  - عند بدء عملية Veo نحفظ `{ operationName, prompt, startedAt, totalTimeoutMs }` في `sessionStorage["veo_active_op"]`.
  - الحلقة polling تكتشف انقطاع الشبكة (`navigator.onLine === false` أو فشل `veo-poll`) → تنتظر حدث `online` ثم تستأنف الـpolling لنفس `operationName` بدلاً من الفشل.
  - عند نجاح/إلغاء/timeout نُمسح المفتاح.
  - دالة جديدة `resumeVeoIfAny()` تُستدعى من `CreatePage` عند الإقلاع: إذا وُجد `operationName` نشط وضمن المهلة، يستأنف الـpolling تلقائياً ويُظهر شريط حالة بدون أي toast أخطاء.

## 2. تقدير الوقت المتبقي (ETA) بجانب ⏱️
- في `VeoProgress` نضيف `etaMs?: number`.
- المنطق: نسجّل عيّنات `{t, progressPct}` من كل poll. متوسط سرعة التقدم = Δpct/Δt. `etaMs = (100 - pct) / avgRate`.
- إذا لم تتوفر `progressPct` من Veo (شائع)، نحسب ETA افتراضياً من متوسط زمن جلسات Veo الناجحة المخزّن في `localStorage["veo_avg_duration_ms"]` (يُحدّث بعد كل نجاح بمتوسط متحرك).
- في `CreatePage` نعرض: `⏱️ مضى 0:45 — متبقّي ~1:20`.

## 3. Rate limiting على مستوى المستخدم عبر Supabase
- التطبيق بلا تسجيل دخول → نستخدم `client_id` UUID عشوائي يُولَّد مرة ويُحفظ في `localStorage` (نفس الجهاز/التبويبات تشترك؛ بين الأجهزة مستقل — أفضل ما يمكن دون auth).
- جدول `public.veo_rate_limits(client_id text, started_at timestamptz)` مع index على `(client_id, started_at)`. RLS مغلق؛ الوصول فقط عبر edge function.
- في `veo-start` edge function: قبل استدعاء Gemini، نحذف الصفوف الأقدم من 60s ثم نَعدّ صفوف العميل. إذا ≥ 3 خلال 60s → نعيد `{ error: "rate_limited", retryInMs }` بحالة 200. ثم نُدرج صفاً جديداً.
- العميل يحوّل الاستجابة إلى `VeoRateLimitError` (نفس السلوك الحالي بدون toast صاخب).

## 4. سجل أحداث Veo في DB قابل للاستعلام
- جدول `public.veo_events`: `client_id text, project_id text, kind text (start|stage|cancel|timeout|fallback|success|resume), payload jsonb, created_at timestamptz`. RLS: قراءة/إدراج للعموم (anon) — مع `GRANT` صحيح.
- دالة helper `logVeoEvent(kind, payload)` في `src/lib/ai.ts` تستخدم `supabase.from('veo_events').insert(...)` بصمت (لا يفشل التدفق).
- نسجّل أحداث: `start`, كل تغيير `stage`, `cancel`, `timeout`, `fallback`, `success`, `resume`.
- صفحة داخلية جديدة `/logs` (`src/pages/LogsPage.tsx`) تعرض آخر 100 حدث للـ `client_id` الحالي مع فلتر بسيط. ربط في `BottomNav` أو زر صغير في `SettingsPage`.

## 5. تفعيل أيقونة المعاينة بدمج الصوت + زر تحميل الفيديو المدموج
- في `ProjectDetailPage.tsx`:
  - النمذجة الحالية للمعاينة (modal) تعمل، لكن نضيف:
    - حقل اختياري `project.audioUrl` (يُملأ مستقبلاً للـVeo).
    - زر داخل المودال: "🔊 دمج صوت من جهازك" يفتح `<input type="file" accept="audio/*">`. عند الاختيار نستدعي ffmpeg.wasm لدمج الفيديو + الصوت → blob جديد.
    - معاينة فورية للنسخة المدموجة في نفس المودال (يستبدل `<video src>`).
    - زر "⬇️ تحميل الفيديو المدموج (MP4)" يستدعي `downloadBlobAsFile`.
  - في `src/lib/video-export.ts` نضيف `mergeAudioWithVideo(videoSrc, audioBlob, onProgress)`:
    - يكتب `input.webm`/`input.mp4` و`audio.<ext>`، ينفّذ `ffmpeg -i v -i a -c:v copy -c:a aac -shortest output.mp4` (مع fallback لإعادة ترميز فيديو لو copy فشل).
  - زر "تحميل" الموجود في الأسفل يبقى كما هو (تنزيل الأصلي). الزر الجديد للنسخة المدموجة.

## التفاصيل التقنية
- لا تغيير على `supabase/config.toml`.
- migration واحدة للجدولين مع `GRANT` و RLS صحيحة (anon insert/select لـ`veo_events`، لا وصول لـ`veo_rate_limits` خارج service_role).
- `veo-start` و`veo-poll` يستخدمان `SUPABASE_SERVICE_ROLE_KEY` للكتابة في `veo_rate_limits`.
- جميع الإضافات صامتة بشأن الأخطاء (لا toasts مزعجة).
- لا تغيير على الأنماط/الألوان؛ نستخدم الـtokens القائمة.

## ملفات ستتعدّل/تُنشأ
- migration جديدة (جدولان + RLS + GRANTs)
- `src/lib/ai.ts` (resume + ETA + logging + DB rate-limit)
- `src/lib/video-export.ts` (mergeAudioWithVideo)
- `src/pages/CreatePage.tsx` (عرض ETA + استدعاء resume عند الإقلاع)
- `src/pages/ProjectDetailPage.tsx` (دمج الصوت + تحميل المدموج في المودال)
- `src/pages/LogsPage.tsx` جديد + إضافة Route في `src/App.tsx` + رابط في `SettingsPage`
- `supabase/functions/veo-start/index.ts` و`veo-poll/index.ts` (تطبيق rate-limit عبر DB + قبول `client_id`)
