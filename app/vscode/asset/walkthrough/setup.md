# Set Up Privy with locally running LLMs

Privy works best with local models, e.g. [Mistral](https://mistral.ai/),
[CodeLLama](https://github.com/facebookresearch/codellama), etc. You can run these models using various solutions like [Ollama](https://github.com/jmorganca/ollama), [llamafile](https://github.com/Mozilla-Ocho/llamafile), [llama.cpp](https://github.com/ggerganov/llama.cpp) etc.

You need to configure the LLM and the corresponding provider that you want to use in the settings.

# Settings

- **kitty-the-coder.provider**(`required`): Pick the platform that is being used for running LLMs locally. There is support for using OpenAI, but this will affect the privacy aspects of the solution. The default is `Ollama`.
- **kitty-the-coder.providerUrl**(`required`): The URL of the platform that is being used for running LLMs locally. The default is `http://localhost:11434`.
- **kitty-the-coder.autocomplete.mode**: Use this setting for enabling/disabling autocompletion feature.
- **kitty-the-coder.autocomplete.model**: Input the name of local Ollama model that you want to use for autocompletion. Supported formats are DeepSeek Coder, LLama & Stable Code. We have chosen deepseek-coder:1.3b-base as it requires least amount of VRAM. You can customize based on your hardware setup.
- **kitty-the-coder.autocomplete.debounceWait**: Use this for setting the time gap before triggering the next completion in milliseconds. Default is 300 ms.
- **kitty-the-coder.model**: Select the LLM that you want to chat with. Currently, supports Mistral and CodeLLama. If you want to use other LLMs, please select `custom` and configure `kitty-the-coder.customModel` accordingly.
- **kitty-the-coder.customModel**: If you want to pick any other models running on your Ollama, please input their name.
- **kitty-the-coder.logger.level**: Specify the verbosity of logs that will appear in 'Privy: Show Logs'.
