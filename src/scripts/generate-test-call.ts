import 'dotenv/config';

import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function main() {
  const text = `
Менеджер: Добрий день, магазин TechZone, мене звати Ірина.
Клієнт: Добрий день. Підкажіть, у вас є Dyson Airwrap?
Менеджер: Так, є в наявності. Повна комплектація, офіційна гарантія 2 роки.
Клієнт: Яка ціна?
Менеджер: 24 999 гривень. Також зараз діє безкоштовна доставка.
Клієнт: Добре, оформлюємо.
Менеджер: Куди відправляємо?
`;

  const response = await openai.audio.speech.create({
    model: 'gpt-4o-mini-tts',
    voice: 'alloy',
    input: text,
  });

  const buffer = Buffer.from(
    await response.arrayBuffer()
  );

  const outputPath = path.join(
    process.cwd(),
    'test-call.mp3'
  );

  fs.writeFileSync(outputPath, buffer);

  console.log('Saved:', outputPath);
}

main();