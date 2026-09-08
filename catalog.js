// Catene note: colore della tessera e formato del codice più diffuso.
// Serve solo a proporre un valore sensato quando aggiungi una tessera:
// tutto resta modificabile a mano.

export const CATALOG = [
  // Supermercati e alimentari — Italia
  { name: 'Esselunga', sub: 'Fìdaty', color: '#C8102E', format: 'ean13', cat: 'Supermercati' },
  { name: 'Coop', sub: 'Socio Coop', color: '#005EB8', format: 'ean13', cat: 'Supermercati' },
  { name: 'Conad', sub: 'Carta Insieme', color: '#F26522', format: 'code128', cat: 'Supermercati' },
  { name: 'Carrefour', sub: 'Carta Payback', color: '#004E9F', format: 'ean13', cat: 'Supermercati' },
  { name: 'Lidl Plus', sub: 'Codice a rotazione', color: '#0050AA', format: 'qrcode', cat: 'Supermercati' },
  { name: 'Pam Panorama', sub: 'Carta Bella', color: '#E30613', format: 'ean13', cat: 'Supermercati' },
  { name: 'Bennet', sub: 'Carta Bennet', color: '#E2001A', format: 'ean13', cat: 'Supermercati' },
  { name: 'Il Gigante', sub: 'Carta Gigante', color: '#009640', format: 'ean13', cat: 'Supermercati' },
  { name: 'Iper', sub: 'Carta Vantaggi', color: '#C4122E', format: 'ean13', cat: 'Supermercati' },
  { name: 'Unes', sub: 'Carta Unes', color: '#F39200', format: 'ean13', cat: 'Supermercati' },
  { name: 'Tigros', sub: 'Carta Tigros', color: '#D81E27', format: 'ean13', cat: 'Supermercati' },
  { name: 'Famila', sub: 'Carta Famila', color: '#003DA5', format: 'ean13', cat: 'Supermercati' },
  { name: 'Crai', sub: 'Carta Crai', color: '#E30613', format: 'ean13', cat: 'Supermercati' },
  { name: 'Despar', sub: 'Carta Despar', color: '#009540', format: 'ean13', cat: 'Supermercati' },
  { name: 'MD', sub: 'Carta MD', color: '#B5121B', format: 'ean13', cat: 'Supermercati' },
  { name: 'Penny Market', sub: 'Penny Card', color: '#E2001A', format: 'ean13', cat: 'Supermercati' },
  { name: 'Aldi', sub: 'Aldi', color: '#00005F', format: 'qrcode', cat: 'Supermercati' },
  { name: 'Eurospin', sub: 'Eurospin', color: '#005CA9', format: 'ean13', cat: 'Supermercati' },
  { name: 'NaturaSì', sub: 'Carta Cuore', color: '#7AB800', format: 'ean13', cat: 'Supermercati' },
  { name: 'Tigotà', sub: 'Carta Tigotà', color: '#E5007E', format: 'ean13', cat: 'Casa e persona' },
  { name: 'Acqua & Sapone', sub: 'Carta fedeltà', color: '#009EE0', format: 'ean13', cat: 'Casa e persona' },

  // Casa, sport, moda
  { name: 'IKEA', sub: 'IKEA Family', color: '#FFDB00', format: 'ean13', cat: 'Casa e tempo libero' },
  { name: 'Leroy Merlin', sub: 'Idea Più', color: '#78BE20', format: 'ean13', cat: 'Casa e tempo libero' },
  { name: 'Decathlon', sub: 'Carta socio', color: '#0082C3', format: 'code39', cat: 'Casa e tempo libero' },
  { name: 'Bricocenter', sub: 'Carta Brico', color: '#E30613', format: 'ean13', cat: 'Casa e tempo libero' },
  { name: 'OBI', sub: 'OBI Card', color: '#FF7900', format: 'ean13', cat: 'Casa e tempo libero' },
  { name: 'Maisons du Monde', sub: 'Carta fedeltà', color: '#A2836E', format: 'ean13', cat: 'Casa e tempo libero' },
  { name: 'OVS', sub: 'OVS Card', color: '#E4002B', format: 'ean13', cat: 'Moda e bellezza' },
  { name: 'Kiko', sub: 'Kiko Club', color: '#111111', format: 'ean13', cat: 'Moda e bellezza' },
  { name: 'Douglas', sub: 'Beauty Card', color: '#6D2077', format: 'ean13', cat: 'Moda e bellezza' },
  { name: 'Sephora', sub: 'Beauty Insider', color: '#111111', format: 'code128', cat: 'Moda e bellezza' },
  { name: 'H&M', sub: 'H&M Member', color: '#E50010', format: 'qrcode', cat: 'Moda e bellezza' },

  // Elettronica e cultura
  { name: 'MediaWorld', sub: 'MediaWorld Club', color: '#E2001A', format: 'ean13', cat: 'Elettronica e cultura' },
  { name: 'Unieuro', sub: 'Carta Unieuro', color: '#D2002E', format: 'ean13', cat: 'Elettronica e cultura' },
  { name: 'Euronics', sub: 'Carta Euronics', color: '#003DA6', format: 'ean13', cat: 'Elettronica e cultura' },
  { name: 'Feltrinelli', sub: 'CartaPiù', color: '#E4002B', format: 'ean13', cat: 'Elettronica e cultura' },
  { name: 'Mondadori', sub: 'Mondadori Card', color: '#003DA5', format: 'ean13', cat: 'Elettronica e cultura' },
  { name: 'Libraccio', sub: 'Carta Libraccio', color: '#F7A600', format: 'ean13', cat: 'Elettronica e cultura' },

  // Carburante e viaggi
  { name: 'Q8', sub: 'Q8 Club', color: '#00A94F', format: 'ean13', cat: 'Viaggi e carburante' },
  { name: 'Eni', sub: 'Eni Station', color: '#0B3B8C', format: 'ean13', cat: 'Viaggi e carburante' },
  { name: 'IP', sub: 'IP Plus', color: '#009640', format: 'ean13', cat: 'Viaggi e carburante' },
  { name: 'Tamoil', sub: 'Tamoil Card', color: '#C8102E', format: 'ean13', cat: 'Viaggi e carburante' },
  { name: 'Trenitalia', sub: 'CartaFRECCIA', color: '#9B1B30', format: 'aztec', cat: 'Viaggi e carburante' },
  { name: 'Italo', sub: 'Italo Più', color: '#B01B2E', format: 'qrcode', cat: 'Viaggi e carburante' },
  { name: 'Autogrill', sub: 'Autogrill Club', color: '#E2001A', format: 'ean13', cat: 'Viaggi e carburante' },
  { name: 'Telepass', sub: 'Telepass', color: '#F9B000', format: 'qrcode', cat: 'Viaggi e carburante' },

  // Estero
  { name: 'Tesco', sub: 'Clubcard · UK', color: '#00539F', format: 'ean13', cat: 'Estero' },
  { name: 'Nectar', sub: 'Sainsbury’s · UK', color: '#F06C00', format: 'ean13', cat: 'Estero' },
  { name: 'Boots', sub: 'Advantage Card · UK', color: '#05054B', format: 'ean13', cat: 'Estero' },
  { name: 'Miles & More', sub: 'Lufthansa', color: '#05164D', format: 'code128', cat: 'Estero' },
  { name: 'Flying Blue', sub: 'Air France · KLM', color: '#002157', format: 'code128', cat: 'Estero' },
  { name: 'Marriott Bonvoy', sub: 'Hotel', color: '#A61C2B', format: 'code128', cat: 'Estero' },
  { name: 'IHG One Rewards', sub: 'Hotel', color: '#6B1F7C', format: 'code128', cat: 'Estero' },
  { name: 'Accor ALL', sub: 'Hotel', color: '#34275C', format: 'code128', cat: 'Estero' },
  { name: 'Starbucks', sub: 'Rewards', color: '#00704A', format: 'code128', cat: 'Estero' },
  { name: 'Fnac', sub: 'Carte Fnac · FR', color: '#C8A200', format: 'ean13', cat: 'Estero' },
  { name: 'El Corte Inglés', sub: 'Tarjeta · ES', color: '#007A33', format: 'ean13', cat: 'Estero' },
  { name: 'dm', sub: 'Payback · DE', color: '#003D7D', format: 'ean13', cat: 'Estero' },
  { name: 'Rossmann', sub: 'DE', color: '#E2001A', format: 'ean13', cat: 'Estero' },
  { name: 'Migros', sub: 'Cumulus · CH', color: '#FF6600', format: 'ean13', cat: 'Estero' },
];

export const CATEGORIES = [
  'Supermercati',
  'Casa e tempo libero',
  'Casa e persona',
  'Moda e bellezza',
  'Elettronica e cultura',
  'Viaggi e carburante',
  'Estero',
  'Altro',
];

// Tavolozza per le tessere che non sono in catalogo
export const PALETTE = [
  '#C8102E', '#005EB8', '#F26522', '#0050AA', '#FFDB00', '#0082C3',
  '#00A94F', '#6D2077', '#E5007E', '#9B1B30', '#78BE20', '#2E2E38',
];

export function findInCatalog(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return CATALOG.filter(
    (c) => c.name.toLowerCase().includes(q) || c.sub.toLowerCase().includes(q)
  ).slice(0, 5);
}
