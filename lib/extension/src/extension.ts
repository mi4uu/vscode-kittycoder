import * as vscode from "vscode";
import { AIClient } from "./ai/AIClient";
import { ApiKeyManager } from "./ai/ApiKeyManager";
import { ChatController } from "./chat/ChatController";
import { ChatModel } from "./chat/ChatModel";
import { ChatPanel } from "./chat/ChatPanel";
import { ConversationTypesProvider } from "./conversation/ConversationTypesProvider";
import { DiffEditorManager } from "./diff/DiffEditorManager";
import { indexRepository } from "./index/indexRepository";
import { getVSCodeLogLevel, LoggerUsingVSCodeOutput } from "./logger";
import { AutoCompleteProvider } from "./autocomplete/AutoCompleteProvider";

export const activate = async (context: vscode.ExtensionContext) => {
  const apiKeyManager = new ApiKeyManager({
    secretStorage: context.secrets,
  });

  const mainOutputChannel = vscode.window.createOutputChannel("Privy");
  const indexOutputChannel = vscode.window.createOutputChannel("Privy Index");

  const vscodeLogger = new LoggerUsingVSCodeOutput({
    outputChannel: mainOutputChannel,
    level: getVSCodeLogLevel(),
  });
  vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration("kitty-the-coder.logger.level")) {
      vscodeLogger.setLevel(getVSCodeLogLevel());
    }
  });

  const hasOpenAIApiKey = await apiKeyManager.hasOpenAIApiKey();
  const chatPanel = new ChatPanel({
    extensionUri: context.extensionUri,
    apiKeyManager,
    hasOpenAIApiKey,
    logger: vscodeLogger,
  });

  const chatModel = new ChatModel();

  const conversationTypesProvider = new ConversationTypesProvider({
    extensionUri: context.extensionUri,
  });

  await conversationTypesProvider.loadConversationTypes();

  const ai = new AIClient({
    apiKeyManager,
    logger: vscodeLogger,
  });

  const chatController = new ChatController({
    chatPanel,
    chatModel,
    ai,
    diffEditorManager: new DiffEditorManager({
      extensionUri: context.extensionUri,
    }),
    getConversationType(id: string) {
      return conversationTypesProvider.getConversationType(id);
    },
    basicChatTemplateId: "chat-en",
    logger: vscodeLogger,
  });

  chatPanel.onDidReceiveMessage(
    chatController.receivePanelMessage.bind(chatController)
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "kitty-the-coder.chat",
      chatPanel
    ),

    vscode.commands.registerCommand(
      "kitty-the-coder.startConversation",
      (templateId) => chatController.createConversation(templateId)
    ),

    vscode.commands.registerCommand("kitty-the-coder.diagnoseErrors", () => {
      chatController.createConversation("diagnose-errors");
    }),
    vscode.commands.registerCommand("kitty-the-coder.explainCode", () => {
      chatController.createConversation("explain-code");
    }),
    vscode.commands.registerCommand("kitty-the-coder.findBugs", () => {
      chatController.createConversation("find-bugs");
    }),
    vscode.commands.registerCommand("kitty-the-coder.generateCode", () => {
      chatController.createConversation("generate-code");
    }),
    vscode.commands.registerCommand("kitty-the-coder.generateUnitTest", () => {
      chatController.createConversation("generate-unit-test");
    }),
    vscode.commands.registerCommand("kitty-the-coder.startChat", () => {
      chatController.createConversation("chat-en");
    }),
    vscode.commands.registerCommand("kitty-the-coder.editCode", () => {
      chatController.createConversation("edit-code");
    }),
    vscode.commands.registerCommand(
      "kitty-the-coder.startCustomChat",
      async () => {
        const items = conversationTypesProvider
          .getConversationTypes()
          .map((conversationType) => ({
            id: conversationType.id,
            label: conversationType.label,
            description: (() => {
              const tags = conversationType.tags;
              return tags == null
                ? conversationType.source
                : `${conversationType.source}, ${tags.join(", ")}`;
            })(),
            detail: conversationType.description,
          }));

        const result = await vscode.window.showQuickPick(items, {
          title: `Start Custom Chat…`,
          matchOnDescription: true,
          matchOnDetail: true,
          placeHolder: "Select conversation type…",
        });

        if (result == undefined) {
          return; // user cancelled
        }

        await chatController.createConversation(result.id);
      }
    ),
    vscode.commands.registerCommand(
      "kitty-the-coder.touchBar.startChat",
      () => {
        chatController.createConversation("chat-en");
      }
    ),
    vscode.commands.registerCommand(
      "kitty-the-coder.showChatPanel",
      async () => {
        await chatController.showChatPanel();
      }
    ),
    vscode.commands.registerCommand("kitty-the-coder.getStarted", async () => {
      await vscode.commands.executeCommand("workbench.action.openWalkthrough", {
        category: `Privy.kitty-the-coder-vscode#kitty-the-coder`,
      });
    }),
    vscode.commands.registerCommand(
      "kitty-the-coder.openSettings",
      async () => {
        await vscode.commands.executeCommand(
          "workbench.action.openSettings",
          `@ext:kitty-the-coder.kitty-the-coder-vscode`
        );
      }
    ),
    vscode.commands.registerCommand(
      "kitty-the-coder.reloadTemplates",
      async () => {
        await conversationTypesProvider.loadConversationTypes();
        vscode.window.showInformationMessage("Privy templates reloaded.");
      }
    ),

    vscode.commands.registerCommand("kitty-the-coder.showLogs", () => {
      mainOutputChannel.show(true);
    }),

    vscode.commands.registerCommand("kitty-the-coder.indexRepository", () => {
      indexRepository({
        ai: ai,
        outputChannel: indexOutputChannel,
      });
    }),

    vscode.languages.registerInlineCompletionItemProvider(
      { pattern: "**" },
      new AutoCompleteProvider({ ai: ai, logger: vscodeLogger })
    )
  );

  return Object.freeze({
    async registerTemplate({ template }: { template: string }) {
      conversationTypesProvider.registerExtensionTemplate({ template });
      await conversationTypesProvider.loadConversationTypes();
    },
  });
};

export const deactivate = async () => {
  // noop
};
