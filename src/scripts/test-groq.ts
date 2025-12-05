/**
 * Test Groq AI Integration
 */

import { getGroqClient, AIService } from '../ai';

async function testGroq() {
  console.log('🤖 Testing Groq AI integration...\n');

  try {
    if (!process.env.GROQ_API_KEY) {
      console.log('❌ GROQ_API_KEY not found in environment variables');
      console.log('\n📝 To fix this:');
      console.log('1. Get a free API key from: https://console.groq.com/keys');
      console.log('2. Add it to your .env file: GROQ_API_KEY=your_key_here');
      process.exit(1);
    }

    const groqClient = getGroqClient();
    const aiService = AIService.getInstance();

    console.log('1. Testing basic completion...');
    const basicResponse = await groqClient.generateCompletion([
      { role: 'user', content: 'Say "Hello from Groq!" and nothing else.' }
    ], { maxTokens: 10 });
    console.log(`   ✓ Response: ${basicResponse.trim()}`);

    console.log('\n2. Testing code explanation...');
    const codeToExplain = `
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}
`;
    const explanation = await aiService.explainCode(codeToExplain);
    console.log(`   ✓ Explanation generated (${explanation.length} chars)`);
    console.log(`   Preview: ${explanation.substring(0, 100)}...`);

    console.log('\n3. Testing API key validation...');
    const isValid = await aiService.validateConnection();
    console.log(`   ✓ API key is ${isValid ? 'valid' : 'invalid'}`);

    console.log('\n✅ All Groq tests passed!');
    console.log('\n🚀 Groq AI is ready to use!');
    
    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ Groq test failed:');
    console.error(error.message);
    process.exit(1);
  }
}

testGroq();
