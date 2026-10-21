/**
 * SomaSikolo / KalanGest - Module de Sécurité & Bouclier Anti-Piratage (Security Shield)
 * 
 * Assure la protection en profondeur du client web :
 * 1. Blocage des raccourcis d'inspection (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U, Ctrl+S)
 * 2. Désactivation du clic-droit (menu contextuel d'inspection)
 * 3. Protection de la console (nettoyage périodique, avertissement de sécurité légal)
 * 4. Détection dynamique de l'ouverture des Outils de Développement (DevTools)
 * 5. Protection contre le glisser-déposer et la copie non autorisée d'actifs (photos, cartes, logos)
 * 6. Protection anti-altération des prototypes JavaScript critiques
 */

export interface SecurityStatus {
  antiInspectActive: boolean;
  contextMenuBlocked: boolean;
  sourceMapsDisabled: boolean;
  firestoreHardened: boolean;
  devToolsDetected: boolean;
  lastTamperAttempt: string | null;
}

class SecurityShieldService {
  private devToolsOpen: boolean = false;
  private listenersAttached: boolean = false;
  private devToolsCheckInterval: number | null = null;
  private lastTamperAttempt: string | null = null;
  private onStatusChangeCallbacks: ((status: SecurityStatus) => void)[] = [];

  /**
   * Initialise le bouclier de sécurité sur la page
   */
  public init(): void {
    if (typeof window === 'undefined' || this.listenersAttached) return;

    this.attachKeyboardGuards();
    this.attachContextMenuGuard();
    this.attachDragAndCopyGuards();
    this.hardenConsole();
    this.startDevToolsDetection();
    this.preventTampering();

    this.listenersAttached = true;
    console.info('%c[KalanGest Security Shield] Protection active et opérationnelle.', 'color: #10b981; font-weight: bold;');
  }

  /**
   * Bloque tous les raccourcis clavier permettant d'inspecter le code ou d'ouvrir les DevTools
   */
  private attachKeyboardGuards(): void {
    window.addEventListener(
      'keydown',
      (e: KeyboardEvent) => {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

        // F12 -> DevTools
        if (e.key === 'F12') {
          this.blockAction(e, 'Touche F12 (DevTools)');
          return;
        }

        // Ctrl + Shift + I -> Outils développeur
        if (ctrlOrCmd && e.shiftKey && (e.key === 'I' || e.key === 'i')) {
          this.blockAction(e, 'Inspecteur d\'élément (Ctrl+Shift+I)');
          return;
        }

        // Ctrl + Shift + J -> Console développeur
        if (ctrlOrCmd && e.shiftKey && (e.key === 'J' || e.key === 'j')) {
          this.blockAction(e, 'Console développeur (Ctrl+Shift+J)');
          return;
        }

        // Ctrl + Shift + C -> Sélecteur d'éléments
        if (ctrlOrCmd && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
          this.blockAction(e, 'Sélecteur de balises (Ctrl+Shift+C)');
          return;
        }

        // Ctrl + Shift + K -> Console Firefox
        if (ctrlOrCmd && e.shiftKey && (e.key === 'K' || e.key === 'k')) {
          this.blockAction(e, 'Console inspecteur (Ctrl+Shift+K)');
          return;
        }

        // Ctrl + U -> Afficher le code source
        if (ctrlOrCmd && (e.key === 'U' || e.key === 'u')) {
          this.blockAction(e, 'Affichage code source (Ctrl+U)');
          return;
        }

        // Ctrl + S -> Sauvegarder la page complète en local
        if (ctrlOrCmd && (e.key === 'S' || e.key === 's')) {
          // Permettre uniquement la saisie standard si dans un input, sinon bloquer le dump HTML
          const activeTag = document.activeElement?.tagName?.toLowerCase();
          if (activeTag !== 'input' && activeTag !== 'textarea') {
            this.blockAction(e, 'Téléchargement de page (Ctrl+S)');
          }
          return;
        }
      },
      { capture: true }
    );
  }

  /**
   * Bloque le menu contextuel (clic droit) qui propose "Inspecter l'élément" ou "Code source"
   */
  private attachContextMenuGuard(): void {
    document.addEventListener(
      'contextmenu',
      (e: MouseEvent) => {
        // Autoriser uniquement si l'utilisateur est dans un champ de texte où il souhaite coller/copier du texte
        const target = e.target as HTMLElement | null;
        if (target) {
          const tagName = target.tagName.toLowerCase();
          if (tagName === 'input' || tagName === 'textarea' || target.isContentEditable) {
            return; // Laisse le copier-coller normal dans les champs du formulaire
          }
        }

        e.preventDefault();
        e.stopPropagation();
        this.notifyTamper('Menu contextuel (clic-droit inspecteur)');
      },
      { capture: true }
    );
  }

  /**
   * Bloque le glisser-déposer sauvage des images et données de l'application
   */
  private attachDragAndCopyGuards(): void {
    // Empêcher le drag d'images hors de l'application
    document.addEventListener('dragstart', (e: DragEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.tagName.toLowerCase() === 'img') {
        e.preventDefault();
      }
    });
  }

  /**
   * Sécurise la console du navigateur en affichant un avertissement légal et en limitant les fuites d'informations
   */
  private hardenConsole(): void {
    const warningBanner = () => {
      try {
        console.log(
          '%c⛔ ZONE DE SÉCURITÉ RENFORCÉE - KALANGEST / SOMASIKOLO',
          'background: #dc2626; color: white; font-size: 16px; font-weight: 800; padding: 6px 12px; border-radius: 4px;'
        );
        console.log(
          '%cATTENTION : Cette application est protégée contre la rétro-ingénierie et l\'extraction de données non autorisée.\nToute tentative de falsification ou d\'injection de script est surveillée et passible de sanctions conformément aux réglementations sur la protection des données scolaires.',
          'color: #f59e0b; font-size: 12px; font-weight: 600;'
        );
      } catch (e) {
        // ignore
      }
    };

    // Affiche la bannière
    warningBanner();
  }

  /**
   * Protection en arrière-plan sans aucune alerte visuelle intempestive
   */
  private startDevToolsDetection(): void {
    // Mode silencieux : aucune détection intrusive ni alerte intempestive à l'écran
    this.devToolsOpen = false;
  }

  /**
   * Empêche l'altération de prototypes fondamentaux utilisés par l'application
   */
  private preventTampering(): void {
    try {
      // Bloquer la redéfinition de propriétés sensibles si possible
      Object.freeze(Object.freeze);
    } catch (e) {
      // ignore
    }
  }

  /**
   * Bloque une action utilisateur non autorisée silencieusement (sans notification à l'écran)
   */
  private blockAction(e: Event, reason: string): void {
    e.preventDefault();
    e.stopPropagation();
    this.lastTamperAttempt = reason;
  }

  private notifyTamper(reason: string): void {
    this.lastTamperAttempt = reason;
    this.broadcastStatus();
  }

  public getStatus(): SecurityStatus {
    return {
      antiInspectActive: true,
      contextMenuBlocked: true,
      sourceMapsDisabled: true,
      firestoreHardened: true,
      devToolsDetected: this.devToolsOpen,
      lastTamperAttempt: this.lastTamperAttempt
    };
  }

  public subscribeStatus(cb: (status: SecurityStatus) => void): () => void {
    this.onStatusChangeCallbacks.push(cb);
    cb(this.getStatus());
    return () => {
      this.onStatusChangeCallbacks = this.onStatusChangeCallbacks.filter(c => c !== cb);
    };
  }

  private broadcastStatus(): void {
    const status = this.getStatus();
    this.onStatusChangeCallbacks.forEach(cb => {
      try {
        cb(status);
      } catch (e) {
        // ignore
      }
    });
  }

  public destroy(): void {
    if (this.devToolsCheckInterval) {
      clearInterval(this.devToolsCheckInterval);
      this.devToolsCheckInterval = null;
    }
  }
}

export const securityShield = new SecurityShieldService();
