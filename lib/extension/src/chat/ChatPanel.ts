import { webviewApi } from "@kitty-the-coder/common";
import * as vscode from "vscode";
import { ApiKeyManager } from "../ai/ApiKeyManager";
import { WebviewContainer } from "../webview/WebviewContainer";
import { ChatModel } from "./ChatModel";
import { Logger } from "../logger";

function getConfigSurfacePromptForOpenAIPlus(): boolean {
  return false;
}

export class ChatPanel implements vscode.WebviewViewProvider {
  public static readonly id = "kitty-the-coder.chat";

  private readonly disposables: vscode.Disposable[] = [];

  private messageEmitter = new vscode.EventEmitter<unknown>();

  readonly onDidReceiveMessage = this.messageEmitter.event;

  private readonly extensionUri: vscode.Uri;

  private webviewPanel: WebviewContainer | undefined;
  private apiKeyManager: ApiKeyManager;

  private state: webviewApi.PanelState;
  private readonly logger: Logger;

  constructor({
    extensionUri,
    apiKeyManager,
    hasOpenAIApiKey,
    logger,
  }: {
    readonly extensionUri: vscode.Uri;
    apiKeyManager: ApiKeyManager;
    /** Needed since retrieving it is an async operation */
    hasOpenAIApiKey: boolean;
    logger: Logger;
  }) {
    this.logger = logger;
    this.extensionUri = extensionUri;
    this.apiKeyManager = apiKeyManager;

    const surfacePromptForOpenAIPlus = getConfigSurfacePromptForOpenAIPlus();
    this.state = {
      type: "chat",
      selectedConversationId: undefined,
      conversations: [],
      hasOpenAIApiKey,
      surfacePromptForOpenAIPlus,
    };

    this.apiKeyManager.onUpdate(async () => {
      if (this.state?.type !== "chat") {
        return;
      }

      const hasOpenAIApiKey = await this.apiKeyManager.hasOpenAIApiKey();
      if (this.state.hasOpenAIApiKey === hasOpenAIApiKey) {
        return;
      }

      this.state.hasOpenAIApiKey = hasOpenAIApiKey;
      this.renderPanel();
    });
  }

  private async renderPanel() {
    return this.webviewPanel?.updateState(this.state);
  }

  async resolveWebviewView(webviewView: vscode.WebviewView) {
    this.webviewPanel = new WebviewContainer({
      panelId: "chat",
      isStateReloadingEnabled: false,
      webview: webviewView.webview,
      extensionUri: this.extensionUri,
    });

    const receiveMessageDisposable = this.webviewPanel.onDidReceiveMessage(
      (message: unknown) => {
        this.messageEmitter.fire(message);
      }
    );

    this.disposables.push(
      webviewView.onDidDispose(() => {
        receiveMessageDisposable.dispose();
        this.webviewPanel = undefined;
      })
    );

    this.disposables.push(
      webviewView.onDidChangeVisibility(async () => {
        if (webviewView.visible) {
          return this.renderPanel();
        }
      })
    );

    // not using await here, to avoid having an infinite load-in-progress indicator
    this.renderPanel();
  }

  async update(model: ChatModel) {
    const conversations: Array<webviewApi.Conversation> = [];
    for (const conversation of model.conversations) {
      conversations.push(await conversation.toWebviewConversation());
    }

    const surfacePromptForOpenAIPlus = getConfigSurfacePromptForOpenAIPlus();
    const hasOpenAIApiKey = false;
    this.state = {
      type: "chat",
      selectedConversationId: model.selectedConversationId,
      conversations,
      hasOpenAIApiKey,
      surfacePromptForOpenAIPlus,
    };
    return this.renderPanel();
  }

  dispose() {
    this.disposables.forEach((disposable) => disposable.dispose());
  }
}
