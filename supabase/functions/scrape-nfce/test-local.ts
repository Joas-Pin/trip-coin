// Teste da Edge Function scrape-nfce usando a NFC-e da imagem
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "YOUR_ANON_KEY";
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/scrape-nfce`;

// URL de exemplo da NFC-e SP (baseada na chave da imagem)
// Chave da imagem: 35260642591651178988650010000378681461918593
const NFCE_URL = "https://www.nfce.fazenda.sp.gov.br/nfce/qrcode?p=35260642591651178988650010000378681461918593|2|1|1|A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0";

async function testEdgeFunction() {
  console.log("🧪 Iniciando teste da Edge Function scrape-nfce...");
  console.log("📄 URL da NFC-e:", NFCE_URL);
  console.log("🔗 Endpoint da Edge Function:", FUNCTION_URL);
  console.log("");

  const requestBody = {
    url: NFCE_URL,
    comprovanteId: "test-comprovante-123" // ID de teste
  };

  try {
    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    console.log(`📡 Status da resposta: ${response.status} ${response.statusText}`);
    console.log("");

    const result = await response.json();
    
    if (response.ok) {
      console.log("✅ Teste bem-sucedido!");
      console.log("📊 Dados extraídos:", JSON.stringify(result, null, 2));
    } else {
      console.log("❌ Erro na Edge Function:");
      console.log(JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.log("❌ Erro ao chamar a Edge Function:");
    console.error(error);
  }
}

// Para testar localmente, podemos extrair o HTML diretamente e testar o parser
async function testParserLocally() {
  console.log("🔍 Testando parser SP localmente (simulado)...");
  console.log("");

  // Vamos importar os módulos
  const { ParserSP } = await import("./parsers/parser-sp.ts");
  const { scrapePage } = await import("./scraper/index.ts");

  try {
    // Vamos tentar acessar a página da NFC-e SP diretamente
    console.log("🌐 Buscando página da NFC-e...");
    const html = await scrapePage(NFCE_URL);
    console.log(`✅ Página carregada com sucesso! (${html.length} caracteres)`);
    console.log("");

    console.log("📝 Analisando HTML com ParserSP...");
    const parser = new ParserSP();
    const dados = await parser.parse(html);
    dados.urlConsulta = NFCE_URL;

    console.log("✅ Dados extraídos com sucesso:");
    console.log(JSON.stringify(dados, null, 2));
  } catch (error) {
    console.log("❌ Erro no teste local:");
    console.error(error);
  }
}

// Executar o teste
console.log("Escolha o teste:");
console.log("1 - Testar Edge Function");
console.log("2 - Testar parser localmente");
console.log("");

// Por padrão, testamos o parser localmente para evitar dependências externas
testParserLocally();