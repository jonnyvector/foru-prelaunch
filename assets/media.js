import { Component } from '@theme/component';
import { ThemeEvents, MediaStartedPlayingEvent } from '@theme/events';
import { DialogCloseEvent } from '@theme/dialog';

/**
 * A deferred media element
 * @typedef {Object} Refs
 * @property {HTMLElement} deferredMediaPlayButton - The button to show the deferred media content
 * @property {HTMLElement} toggleMediaButton - The button to toggle the media
 *
 * @extends {Component<Refs>}
 */
class DeferredMedia extends Component {
  /** @type {boolean} */
  isPlaying = false;

  #abortController = new AbortController();

  connectedCallback() {
    super.connectedCallback();
    const signal = this.#abortController.signal;
    // If we're to use deferred media for images, we will need to run this only when it's not an image type media
    document.addEventListener(ThemeEvents.mediaStartedPlaying, this.pauseMedia.bind(this), { signal });
    window.addEventListener(DialogCloseEvent.eventName, this.pauseMedia.bind(this), { signal });
    
    // Check for battery saver fallback after content loads
    if (this.hasAttribute('autoplay') && this.dataset.batterySaverFallback === 'true') {
      console.log('Setting up battery saver checks'); // Debug log
      
      // For iOS devices, use a simple detection method
      if (this.isIOSDevice()) {
        console.log('iOS device detected, setting up play button detection'); // Debug log
        this.setupIOSPlayButtonDetection();
      }
      
      this.checkAutoplaySupport();
      
      // Also add a simple timer-based check as backup
      setTimeout(() => {
        console.log('Timer-based fallback check'); // Debug log
        this.checkVideoPlayingState();
      }, 2000);
    }
    
    // Also check when actual video content loads using MutationObserver
    if (this.hasAttribute('autoplay') && this.dataset.batterySaverFallback === 'true') {
      this.observeVideoLoad();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#abortController.abort();
  }

  /**
   * Updates the visual hint for play/pause state
   * @param {boolean} isPlaying - Whether the video is currently playing
   */
  updatePlayPauseHint(isPlaying) {
    const toggleMediaButton = this.refs.toggleMediaButton;
    if (toggleMediaButton instanceof HTMLElement) {
      toggleMediaButton.classList.remove('hidden');
      const playIcon = toggleMediaButton.querySelector('.icon-play');
      if (playIcon) playIcon.classList.toggle('hidden', isPlaying);
      const pauseIcon = toggleMediaButton.querySelector('.icon-pause');
      if (pauseIcon) pauseIcon.classList.toggle('hidden', !isPlaying);
    }
  }

  /**
   * Shows the deferred media content
   */
  showDeferredMedia = () => {
    this.loadContent(true);
    this.isPlaying = true;
    this.updatePlayPauseHint(this.isPlaying);
  };

  /**
   * Loads the content
   * @param {boolean} [focus] - Whether to focus the content
   */
  loadContent(focus = true) {
    if (this.getAttribute('data-media-loaded')) return;

    this.dispatchEvent(new MediaStartedPlayingEvent(this));

    const content = this.querySelector('template')?.content.firstElementChild?.cloneNode(true);

    if (!content) return;

    this.setAttribute('data-media-loaded', 'true');
    this.appendChild(content);

    if (focus && content instanceof HTMLElement) {
      content.focus();
    }

    this.refs.deferredMediaPlayButton?.classList.add('deferred-media__playing');

    if (content instanceof HTMLVideoElement && content.getAttribute('autoplay')) {
      // force autoplay for safari
      content.play();
    }
  }

  /**
   * Toggle play/pause state of the media
   */
  toggleMedia() {
    if (this.isPlaying) {
      this.pauseMedia();
    } else {
      this.playMedia();
    }
  }

  playMedia() {
    /** @type {HTMLIFrameElement | null} */
    const iframe = this.querySelector('iframe[data-video-type]');
    if (iframe) {
      iframe.contentWindow?.postMessage(
        iframe.dataset.videoType === 'youtube'
          ? '{"event":"command","func":"playVideo","args":""}'
          : '{"method":"play"}',
        '*'
      );
    } else {
      this.querySelector('video')?.play();
    }
    this.isPlaying = true;
    this.updatePlayPauseHint(this.isPlaying);
  }

  /**
   * Pauses the media
   */
  pauseMedia() {
    /** @type {HTMLIFrameElement | null} */
    const iframe = this.querySelector('iframe[data-video-type]');

    if (iframe) {
      iframe.contentWindow?.postMessage(
        iframe.dataset.videoType === 'youtube'
          ? '{"event":"command","func":"' + 'pauseVideo' + '","args":""}'
          : '{"method":"pause"}',
        '*'
      );
    } else {
      this.querySelector('video')?.pause();
    }
    this.isPlaying = false;

    // If we've already revealed the deferred media, we should toggle the play/pause hint
    if (this.getAttribute('data-media-loaded')) {
      this.updatePlayPauseHint(this.isPlaying);
    }
  }

  /**
   * Checks if autoplay is supported and shows fallback if not
   */
  async checkAutoplaySupport() {
    console.log('checkAutoplaySupport called'); // Debug log
    console.log('isMobileDevice:', this.isMobileDevice()); // Debug log
    console.log('isIOSDevice:', this.isIOSDevice()); // Debug log
    console.log('isBatterySaverLikely:', this.isBatterySaverLikely()); // Debug log
    
    // Be aggressive on iOS devices since battery saver mode is common
    if (this.isIOSDevice()) {
      console.log('iOS device - showing fallback proactively'); // Debug log
      // Wait a moment to see if autoplay works, then show fallback if not
      setTimeout(() => {
        const videos = this.querySelectorAll('video');
        let anyPlaying = false;
        videos.forEach(video => {
          if (video && !video.paused) anyPlaying = true;
        });
        if (!anyPlaying) {
          console.log('No videos playing on iOS, showing fallback'); // Debug log
          this.showBatterySaverFallback();
        }
      }, 1000);
      return;
    }
    
    // For other mobile devices with battery saver indicators
    if (this.isMobileDevice() && this.isBatterySaverLikely()) {
      console.log('Showing fallback due to mobile + battery saver'); // Debug log
      this.showBatterySaverFallback();
      return;
    }
    
    try {
      // Create a tiny test video to check autoplay capability
      const testVideo = document.createElement('video');
      testVideo.muted = true;
      testVideo.playsInline = true;
      testVideo.style.position = 'absolute';
      testVideo.style.top = '-9999px';
      testVideo.style.width = '1px';
      testVideo.style.height = '1px';
      
      // Use a data URI for a minimal video
      testVideo.src = 'data:video/mp4;base64,AAAAIGZ0eXBtcDQyAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAABhtZGF0AAAJ2UQhAAgjEgABQOQM=';
      
      document.body.appendChild(testVideo);
      
      const playPromise = testVideo.play();
      if (playPromise && typeof playPromise.then === 'function') {
        await playPromise;
      }
      
      // If we get here, autoplay works
      document.body.removeChild(testVideo);
    } catch (error) {
      // Autoplay failed - show battery saver fallback
      this.showBatterySaverFallback();
      const testVideo = document.querySelector('video[src^="data:video"]');
      if (testVideo) {
        document.body.removeChild(testVideo);
      }
    }
  }

  /**
   * Observes when video content is loaded and checks autoplay
   */
  observeVideoLoad() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (node instanceof Element && node.tagName === 'VIDEO') {
              // Add error event listener to catch autoplay failures
              node.addEventListener('error', () => this.showBatterySaverFallback());
              node.addEventListener('abort', () => this.showBatterySaverFallback());
              
              // Also check playback state after a delay
              setTimeout(() => this.checkActualVideoAutoplay(), 1000);
              observer.disconnect();
              return;
            } else if (node instanceof Element && node.tagName === 'IFRAME') {
              setTimeout(() => this.checkActualVideoAutoplay(), 1000);
              observer.disconnect();
              return;
            }
          }
        }
      }
    });
    
    observer.observe(this, { childList: true, subtree: true });
  }

  /**
   * Checks if the actual loaded video is playing (for cases where test video passes but real video fails)
   */
  checkActualVideoAutoplay() {
    // Get all videos, excluding the template ones
    const videos = Array.from(this.querySelectorAll('video')).filter(v => !v.closest('template'));
    const iframes = Array.from(this.querySelectorAll('iframe')).filter(i => !i.closest('template'));
    
    if (videos.length > 0) {
      const video = videos[0]; // Get the first non-template video
      // For HTML5 video, check if it's actually playing
      if (video && (video.paused || video.ended || video.readyState < 3)) {
        this.showBatterySaverFallback();
      }
    } else if (iframes.length > 0) {
      // For external videos, show fallback immediately on mobile devices with battery saver
      if (this.isMobileDevice()) {
        this.showBatterySaverFallback();
      }
    }
  }

  /**
   * Simple iOS play button detection
   */
  setupIOSPlayButtonDetection() {
    console.log('Setting up iOS play button detection'); // Debug log
    
    // Wait for video elements to load
    setTimeout(() => {
      const videos = Array.from(this.querySelectorAll('video')).filter(v => !v.closest('template'));
      
      if (videos.length > 0) {
        const video = videos[0];
        console.log('Monitoring video element:', video); // Debug log
        
        // Listen for events that indicate the video is blocked
        video.addEventListener('pause', () => {
          console.log('Video paused event - checking if blocked'); // Debug log
          if (video.autoplay && video.currentTime === 0) {
            console.log('Video blocked by iOS - showing fallback'); // Debug log
            this.showBatterySaverFallback();
          }
        });
        
        video.addEventListener('suspend', () => {
          console.log('Video suspend event - showing fallback'); // Debug log
          this.showBatterySaverFallback();
        });
        
        // Check after a short delay if video is playing
        setTimeout(() => {
          if (video.paused && video.currentTime === 0) {
            console.log('Video not playing after delay - showing fallback'); // Debug log
            this.showBatterySaverFallback();
          }
        }, 1000);
      }
    }, 100);
  }

  /**
   * Detect iOS low power mode indicators
   */
  isLowPowerMode() {
    // Check frame rate - low power mode often reduces animation frame rate
    let frameCount = 0;
    let startTime = Date.now();
    
    const checkFrameRate = () => {
      frameCount++;
      if (Date.now() - startTime < 100) {
        requestAnimationFrame(checkFrameRate);
      } else {
        // If frame rate is very low (< 30fps), might indicate low power mode
        const fps = frameCount * 10; // approximate fps
        if (fps < 30) {
          console.log('Low frame rate detected:', fps, 'fps'); // Debug log
          return true;
        }
      }
    };
    
    requestAnimationFrame(checkFrameRate);
    return false;
  }

  /**
   * Simple check to see if any video is actually playing
   */
  checkVideoPlayingState() {
    const videos = Array.from(this.querySelectorAll('video')).filter(v => !v.closest('template'));
    const iframes = Array.from(this.querySelectorAll('iframe')).filter(i => !i.closest('template'));
    
    console.log('Found videos:', videos.length, 'iframes:', iframes.length); // Debug log
    
    // For HTML5 videos, let the native poster handle fallback - no need to override
    // Only handle iframes (external videos) which can't have posters
    if (iframes.length > 0) {
      // For iframes, show fallback on mobile or when battery saver is detected
      if (this.isMobileDevice() || this.isBatterySaverLikely()) {
        console.log('Mobile device or battery saver with iframe, showing fallback'); // Debug log
        this.showBatterySaverFallback();
      }
    }
  }

  /**
   * Shows the battery saver fallback image
   */
  showBatterySaverFallback() {
    console.log('showBatterySaverFallback called'); // Debug log
    console.log('Element classes before:', this.className); // Debug log
    
    // Add battery-saver-active class to trigger CSS
    this.classList.add('battery-saver-active');
    
    console.log('Element classes after:', this.className); // Debug log
    
    const fallback = this.querySelector('.battery-saver-fallback');
    if (fallback instanceof HTMLElement) {
      console.log('Fallback element found, showing it'); // Debug log
      console.log('Fallback element style before:', fallback.style.display); // Debug log
      
      // Force show with inline styles as backup
      fallback.style.display = 'block';
      fallback.style.position = 'absolute';
      fallback.style.top = '0';
      fallback.style.left = '0';
      fallback.style.width = '100%';
      fallback.style.height = '100%';
      fallback.style.zIndex = '99999';
      fallback.style.background = '#000';
      
      console.log('Fallback element style after:', fallback.style.display); // Debug log
    } else {
      console.log('No fallback element found'); // Debug log
    }
    
    // Hide all videos and iframes with multiple methods
    const videos = this.querySelectorAll('video, iframe');
    console.log('Found videos/iframes to hide:', videos.length); // Debug log
    videos.forEach((video, index) => {
      if (video instanceof HTMLElement) {
        console.log(`Hiding video/iframe ${index}`); // Debug log
        video.style.display = 'none';
        video.style.visibility = 'hidden';
        video.style.opacity = '0';
      }
    });
  }

  /**
   * Hides the battery saver fallback image
   */
  hideBatterySaverFallback() {
    console.log('hideBatterySaverFallback called'); // Debug log
    
    // Remove battery-saver-active class
    this.classList.remove('battery-saver-active');
    
    const fallback = this.querySelector('.battery-saver-fallback');
    if (fallback instanceof HTMLElement) {
      fallback.style.display = 'none';
    }
    
    // Show videos again
    const videos = this.querySelectorAll('video, iframe');
    videos.forEach(video => {
      if (video instanceof HTMLElement) {
        video.style.display = '';
        video.style.visibility = '';
        video.style.opacity = '';
      }
    });
  }

  /**
   * Detects if device is mobile
   */
  isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
  }

  /**
   * Detects if device is iOS
   */
  isIOSDevice() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  /**
   * Detects if battery saver mode is likely active
   */
  isBatterySaverLikely() {
    // Check for battery saver indicators
    const connection = /** @type {any} */ (navigator).connection;
    if (connection) {
      // Slow connection might indicate data saver mode
      if (connection.saveData || 
          connection.effectiveType === 'slow-2g' || 
          connection.effectiveType === '2g') {
        return true;
      }
    }
    
    // Check if device memory is low (potential battery saver indicator)
    const deviceMemory = /** @type {any} */ (navigator).deviceMemory;
    if (deviceMemory && deviceMemory <= 2) {
      return true;
    }
    
    // For iOS, only assume battery saver if we have other indicators
    // (removing blanket iOS detection as it was too aggressive)
    
    return false;
  }
}

if (!customElements.get('deferred-media')) {
  customElements.define('deferred-media', DeferredMedia);
}

/**
 * A product model
 */
class ProductModel extends DeferredMedia {
  #abortController = new AbortController();

  loadContent() {
    super.loadContent();

    Shopify.loadFeatures([
      {
        name: 'model-viewer-ui',
        version: '1.0',
        onLoad: this.setupModelViewerUI.bind(this),
      },
    ]);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#abortController.abort();
  }

  pauseMedia() {
    super.pauseMedia();
    this.modelViewerUI?.pause();
  }

  playMedia() {
    super.playMedia();
    this.modelViewerUI?.play();
  }

  /**
   * @param {Error[]} errors
   */
  async setupModelViewerUI(errors) {
    if (errors) return;

    if (!Shopify.ModelViewerUI) {
      await this.#waitForModelViewerUI();
    }

    if (!Shopify.ModelViewerUI) return;

    const element = this.querySelector('model-viewer');
    if (!element) return;

    const signal = this.#abortController.signal;

    this.modelViewerUI = new Shopify.ModelViewerUI(element);
    if (!this.modelViewerUI) return;

    this.playMedia();

    // Track pointer events to detect taps
    let pointerStartX = 0;
    let pointerStartY = 0;

    element.addEventListener(
      'pointerdown',
      (/** @type {PointerEvent} */ event) => {
        pointerStartX = event.clientX;
        pointerStartY = event.clientY;
      },
      { signal }
    );

    element.addEventListener(
      'click',
      (/** @type {PointerEvent} */ event) => {
        const distanceX = Math.abs(event.clientX - pointerStartX);
        const distanceY = Math.abs(event.clientY - pointerStartY);
        const totalDistance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

        // Try to ensure that this is a tap, not a drag.
        if (totalDistance < 10) {
          // When the model is paused, it has its own button overlay for playing the model again.
          // If we're receiving a click event, it means the model is playing, all we can do is pause it.
          this.pauseMedia();
        }
      },
      { signal }
    );
  }

  /**
   * Waits for Shopify.ModelViewerUI to be defined.
   * This seems to be necessary for Safari since Shopify.ModelViewerUI is always undefined on the first try.
   * @returns {Promise<void>}
   */
  async #waitForModelViewerUI() {
    const maxAttempts = 10;
    const interval = 50;

    for (let i = 0; i < maxAttempts; i++) {
      if (Shopify.ModelViewerUI) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }
}

if (!customElements.get('product-model')) {
  customElements.define('product-model', ProductModel);
}
