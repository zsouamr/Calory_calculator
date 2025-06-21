app.post('/analyze-photo', async (req, res) => {
  const { image } = req.body;
  console.log("📷 Image reçue");

  if (!image) {
    console.error("❌ Aucune image reçue !");
    return res.status(400).json({ error: 'Image manquante.' });
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'What is this food and its calories/macros?' },
            { type: 'image_url', image_url: { url: image } },
          ],
        },
      ],
      max_tokens: 500,
    });

    console.log("✅ Réponse GPT reçue !");
    const resultText = response.choices[0].message.content;
    console.log(resultText);

    res.json({
      name: 'From image',
      calories: 300, // simplifié pour test
      macros: { fat: 10, carbs: 20, protein: 15 },
      raw: resultText,
    });
  } catch (error) {
    console.error("❌ Erreur GPT:", error);
    res.status(500).json({ error: 'Erreur GPT-4 Vision' });
  }
});
