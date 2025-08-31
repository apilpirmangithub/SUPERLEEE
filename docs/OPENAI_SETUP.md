# OpenAI Integration Setup

OpenAI integration enhances the SuperLee agent with natural language understanding, smart responses, and image analysis capabilities.

## 🚀 Quick Setup

### 1. Get OpenAI API Key
1. Go to [platform.openai.com](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to **API Keys** section
4. Click **"Create new secret key"**
5. Copy your API key (starts with `sk-...`)

### 2. Add to Environment Variables

**Method 1: Using DevServerControl (Recommended)**
Use the DevServerControl tool to set the environment variable:
```
OPENAI_API_KEY=your_api_key_here
```

**Method 2: Manual .env.local**
Add to your `.env.local` file:
```bash
# OpenAI Configuration
OPENAI_API_KEY=your_api_key_here
# Optional: For client-side usage (less secure)
NEXT_PUBLIC_OPENAI_API_KEY=your_api_key_here
```

### 3. Restart Development Server
After adding environment variables, restart your dev server for changes to take effect.

## 🧠 AI Features Enabled

### Natural Language Command Parsing
- **Before**: "swap 1 WIP > USDC" (exact format required)
- **After**: "I want to trade some WIP for USDC, maybe 1 token"

### Smart Conversational Responses
- Context-aware replies
- Helpful clarifications
- Indonesian language support with casual tone

### Image Analysis for IP Registration
- Automatic description generation
- Suggested titles for artwork
- Object detection and style analysis
- Mood and emotion detection

## 📊 Pricing & Usage

### OpenAI API Costs
- **GPT-3.5-turbo**: ~$0.002 per 1K tokens
- **GPT-4-vision**: ~$0.01 per 1K tokens
- **Free tier**: $5 credit for new accounts

### Estimated Usage
- **Command parsing**: ~100-200 tokens per command
- **Image analysis**: ~500-1000 tokens per image
- **Monthly cost**: $2-10 for typical usage

For current pricing: [OpenAI Pricing](https://openai.com/pricing)

## 🔧 Configuration Options

### Model Selection
You can configure which models to use by modifying `src/lib/openai.ts`:

```typescript
// For faster, cheaper responses
model: 'gpt-3.5-turbo'

// For better understanding (higher cost)
model: 'gpt-4'

// For image analysis
model: 'gpt-4-vision-preview'
```

### Temperature Settings
- **0.3**: More focused, deterministic responses
- **0.7**: Balanced creativity and consistency  
- **1.0**: More creative, varied responses

## 🛠️ Troubleshooting

### Common Issues

1. **"OpenAI API key not found"**
   - Verify environment variable is set correctly
   - Restart development server
   - Check for typos in variable name

2. **"Rate limit exceeded"**
   - You've hit OpenAI's usage limits
   - Wait a few minutes or upgrade your plan
   - Consider implementing request throttling

3. **"Invalid API key"**
   - Regenerate API key in OpenAI dashboard
   - Ensure no extra spaces or characters
   - Verify account has credits/billing setup

4. **"Model not found"**
   - Check if your account has access to the model
   - Some models require paid subscription
   - Fallback to gpt-3.5-turbo if needed

### Debug Mode
Check browser console or server logs for detailed error messages:
```javascript
// Check OpenAI status
import { getOpenAIStatus } from '@/lib/openai';
console.log(getOpenAIStatus());
```

## 🔄 Fallback Behavior

If OpenAI is not configured or fails:
1. ✅ App continues with rule-based parsing
2. ✅ All core features remain functional
3. ✅ No disruption to user experience
4. ⚠️ Responses will be less intelligent/flexible

This ensures your application works reliably even without AI features.

## 🎯 Benefits of Integration

### For Users
- **Natural conversation**: Type commands however feels natural
- **Smart suggestions**: AI helps clarify unclear requests  
- **Rich descriptions**: Automatic image analysis saves time
- **Better UX**: More human-like interaction

### For Developers
- **Reduced parsing complexity**: Let AI handle language variations
- **Enhanced metadata**: Rich image descriptions for NFTs
- **Extensible**: Easy to add new AI-powered features
- **Maintainable**: Less hardcoded rules to maintain

## 📚 OpenAI Documentation

- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [GPT Models Guide](https://platform.openai.com/docs/models)
- [Vision API Documentation](https://platform.openai.com/docs/guides/vision)
- [Best Practices](https://platform.openai.com/docs/guides/best-practices)

## 🔐 Security Best Practices

1. **Never expose API keys** in client-side code
2. **Use environment variables** for sensitive data
3. **Implement rate limiting** to prevent abuse
4. **Monitor usage** to avoid unexpected costs
5. **Rotate keys regularly** for security

## 🚀 Next Steps

After setup:
1. Test command parsing with natural language
2. Upload an image to test AI analysis
3. Monitor usage in OpenAI dashboard
4. Consider upgrading for higher limits if needed

The AI integration will make SuperLee much smarter and more user-friendly!
