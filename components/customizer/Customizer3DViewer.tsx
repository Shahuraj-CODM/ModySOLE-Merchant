import React, { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';
import { Colors } from '../../constants/theme';

const API_URL = (Constants.expoConfig?.extra?.apiUrl as string) || 'http://localhost:5000';

interface ViewerProps {
  baseColor: string;
  soleId: string;
  laceColor: string;
  activeTab: 'base' | 'sole';
}

export default function Customizer3DViewer({ baseColor, soleId, laceColor, activeTab }: ViewerProps) {
  const [html, setHtml] = useState<string | null>(null);
  const webviewRef = useRef<WebView>(null);

  useEffect(() => {
    async function loadAssets() {
      try {
        const shoeUrl = `${API_URL}/models/Shoes.glb`;
        const sole1Url = `${API_URL}/models/Sole1.glb`;
        const sole2Url = `${API_URL}/models/Sole2.glb`;
        const sole3Url = `${API_URL}/models/Sole3.glb`;

        const viewerHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
            <style>
              body { margin: 0; padding: 0; background-color: transparent; overflow: hidden; width: 100vw; height: 100vh; position: relative; }
              model-viewer {
                width: 100%;
                height: 100%;
                background-color: transparent;
                --poster-color: transparent;
              }
            </style>
            <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js"></script>
          </head>
          <body>
            <model-viewer 
              id="shoeViewer"
              src="${shoeUrl}"
              style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: block;"
              camera-controls 
              interaction-prompt="none"
              shadow-intensity="1"
              environment-image="neutral"
              exposure="1.2"
              camera-orbit="45deg 75deg auto"
              camera-target="0m 0m 0m"
            >
            </model-viewer>
            
            <model-viewer 
              id="soleViewer"
              src="${sole1Url}"
              style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: none; pointer-events: none;"
              camera-controls
              interaction-prompt="none"
              shadow-intensity="0"
              environment-image="neutral"
              exposure="1.2"
              camera-orbit="45deg 75deg auto"
              camera-target="0m 0m 0m"
            ></model-viewer>

            <script>
              const shoeViewer = document.getElementById('shoeViewer');
              const soleViewer = document.getElementById('soleViewer');
              
              const soleMap = {
                's1': '${sole1Url}',
                's2': '${sole2Url}',
                's3': '${sole3Url}',
                's4': '${sole1Url}' 
              };

              let activeTab = 'base';

              function updateVisibility() {
                if (activeTab === 'base') {
                  shoeViewer.style.display = 'block';
                  shoeViewer.style.pointerEvents = 'auto';
                  
                  soleViewer.style.display = 'none';
                  soleViewer.style.pointerEvents = 'none';
                } else {
                  soleViewer.style.display = 'block';
                  soleViewer.style.pointerEvents = 'auto';
                  
                  shoeViewer.style.display = 'none';
                  shoeViewer.style.pointerEvents = 'none';
                }
              }

              // Sync cameras between the two viewers so they move as one
              shoeViewer.addEventListener('camera-change', (e) => {
                if (activeTab === 'base') {
                  soleViewer.cameraOrbit = shoeViewer.getCameraOrbit().toString();
                }
              });

              soleViewer.addEventListener('camera-change', (e) => {
                if (activeTab === 'sole') {
                  shoeViewer.cameraOrbit = soleViewer.getCameraOrbit().toString();
                }
              });

              // Listen for messages from React Native to change colors and sole models
              document.addEventListener('message', function(event) {
                try {
                  const data = JSON.parse(event.data);
                  
                  // Update activeTab visibility
                  if (data.activeTab && data.activeTab !== activeTab) {
                    activeTab = data.activeTab;
                    updateVisibility();
                  }
                  
                  // Swap Sole Model
                  if (data.soleId && soleMap[data.soleId]) {
                    if (soleViewer.src !== soleMap[data.soleId]) {
                      soleViewer.src = soleMap[data.soleId];
                    }
                  }

                  // Change Colors
                  if (shoeViewer.model && shoeViewer.model.materials.length > 0) {
                     const baseMat = shoeViewer.model.materials.find(m => m.name.toLowerCase().includes('base')) || shoeViewer.model.materials[0];
                     if (data.baseColor && baseMat) baseMat.pbrMetallicRoughness.setBaseColorFactor(data.baseColor);
                     
                     const laceMat = shoeViewer.model.materials.find(m => m.name.toLowerCase().includes('lace')) || shoeViewer.model.materials[1];
                     if (data.laceColor && laceMat) laceMat.pbrMetallicRoughness.setBaseColorFactor(data.laceColor);
                  }
                } catch(err) {
                  // ignore
                }
              });
              
              window.addEventListener('message', function(event) {
                // For iOS compatibility
                document.dispatchEvent(new MessageEvent('message', { data: event.data }));
              });
            </script>
          </body>
          </html>
        `;

        setHtml(viewerHtml);
      } catch (err) {
        console.error("Error loading 3D assets:", err);
      }
    }

    loadAssets();
  }, []);

  useEffect(() => {
    // Whenever props change, send message to WebView to update colors and sole
    if (webviewRef.current && html) {
      const message = JSON.stringify({
        baseColor,
        soleId,
        laceColor,
        activeTab
      });
      webviewRef.current.postMessage(message);
    }
  }, [baseColor, soleId, laceColor, activeTab, html]);

  if (!html) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.gold} size="large" />
      </View>
    );
  }

  return (
    <WebView
      ref={webviewRef}
      style={styles.webview}
      source={{ html, baseUrl: '' }}
      originWhitelist={['*']}
      allowFileAccess={true}
      allowFileAccessFromFileURLs={true}
      allowUniversalAccessFromFileURLs={true}
      javaScriptEnabled={true}
      scrollEnabled={false}
      bounces={false}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent'
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent'
  }
});
