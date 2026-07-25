# دليل المطورين - Demo-AI API

هذا الدليل يشرح كيفية التواصل مع نماذج الذكاء الاصطناعي المتاحة عبر API.

## 1. Demo-AI Pro (Omni)
هذا النموذج يدعم التفاعل الصوتي. يمكنك إرسال ملفات صوتية أو نصوص وسيقوم النموذج بالرد بالصوت.

### كيفية التواصل:
يتم التواصل عبر endpoint `/api/test-model/demo-ai-pro` (للتجربة) أو `/api/v1/chat` (للاستخدام الإنتاجي).

يستخدم النموذج Gradio API (`Qwen/Qwen3.5-Omni-Online-Demo`) عبر endpoint `/media_predict`.

**المعاملات المطلوبة (في `media_predict`):**
- `audio`: ملف صوتي (blob).
- `video`: فيديو (blob، يمكن أن يكون null).
- `history`: تاريخ المحادثة.
- `voice_choice`: نوع الصوت (مثال: "Tina / 中文-甜甜").
- `temperature`: درجة الحرارة.
- `top_p`, `top_k`: معاملات التحكم في التوليد.

---

## 2. Demo-AI Image
نموذج لتحرير وتعديل الصور.

### كيفية التواصل:
يتم التواصل عبر endpoint `/api/test-model/demo-ai-image` (للتجربة) أو `/api/v1/chat` (للاستخدام الإنتاجي).

يستخدم النموذج Gradio API (`ghjjhv/Qwen-Image-Edit-2511-LoRAs-Fast`) عبر endpoint `/infer`.

**المعاملات المطلوبة (في `infer`):**
- `images`: الصورة المراد تعديلها.
- `prompt`: وصف التعديل المطلوب.
- `lora_adapter`: نوع الـ LoRA المستخدم.
- `seed`, `randomize_seed`: للتحكم في العشوائية.
- `guidance_scale`: قوة التوجيه.
- `steps`: عدد خطوات المعالجة.
