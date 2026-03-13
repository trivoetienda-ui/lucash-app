export default async function handler(req, res) {
  // Solo permitir peticiones POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const binanceUrl = `https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search?t=${Date.now()}`;
    
    const response = await fetch(binanceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    
    // Devolvemos la respuesta de Binance directamente al frontend
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Failed to fetch Binance data', details: error.message });
  }
}
