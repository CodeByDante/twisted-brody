import React, { useState } from 'react';
import { Settings, Plus, Minus, Eye, Video, ToggleLeft, ToggleRight, Book } from 'lucide-react';
import { useStore } from '../lib/store';

export default function SettingsPage() {
  const { gridColumns, setGridColumns, settings, setSettings } = useStore();


  const handleIncreaseColumns = () => {
    setGridColumns(Math.min(gridColumns + 1, 4));
  };

  const handleDecreaseColumns = () => {
    setGridColumns(Math.max(gridColumns - 1, 1));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <Settings className="h-8 w-8 text-primary" />
        Ajustes
      </h1>

      <div className="bg-surface rounded-lg p-6 space-y-8">
        <div className="space-y-6">
          <h2 className="text-xl font-medium">Visualización</h2>
          
          <div className="space-y-4">
            <h3 className="font-medium text-gray-300">Columnas en la cuadrícula</h3>
            <div className="flex items-center justify-between gap-4 p-4 bg-surface-light rounded-lg">
              <button
                onClick={handleDecreaseColumns}
                className="p-2 hover:bg-surface rounded-lg transition-colors text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={gridColumns <= 1}
              >
                <Minus className="h-5 w-5" />
              </button>
              
              <div className="flex-1 text-center">
                <span className="text-2xl font-bold">{gridColumns}</span>
                <span className="text-sm text-gray-400 block">columnas</span>
              </div>
              
              <button
                onClick={handleIncreaseColumns}
                className="p-2 hover:bg-surface rounded-lg transition-colors text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={gridColumns >= 4}
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-1 mt-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded ${
                    i < gridColumns ? 'bg-primary' : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-medium">Visibilidad</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-surface-light rounded-lg">
              <div className="flex items-center gap-3">
                <Eye className="h-5 w-5 text-gray-400" />
                <span>Mostrar videos ocultos</span>
              </div>
              <button
                onClick={() => setSettings({ 
                  ...settings,
                  showHiddenVideos: !settings.showHiddenVideos 
                })}
                className="text-gray-300 hover:text-white"
              >
                {settings.showHiddenVideos ? (
                  <ToggleRight className="h-6 w-6 text-primary" />
                ) : (
                  <ToggleLeft className="h-6 w-6" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-surface-light rounded-lg">
              <div className="flex items-center gap-3">
                <Video className="h-5 w-5 text-gray-400" />
                <span>Mostrar videos ocultos en Brody Twis</span>
              </div>
              <button
                onClick={() => setSettings({ 
                  ...settings,
                  showHiddenInShorts: !settings.showHiddenInShorts 
                })}
                className="text-gray-300 hover:text-white"
              >
                {settings.showHiddenInShorts ? (
                  <ToggleRight className="h-6 w-6 text-primary" />
                ) : (
                  <ToggleLeft className="h-6 w-6" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-surface-light rounded-lg">
              <div className="flex items-center gap-3">
                <Plus className="h-5 w-5 text-gray-400" />
                <span>Mostrar botón de agregar video</span>
              </div>
              <button
                onClick={() => setSettings({ 
                  ...settings,
                  showAddButton: !settings.showAddButton 
                })}
                className="text-gray-300 hover:text-white"
              >
                {settings.showAddButton ? (
                  <ToggleRight className="h-6 w-6 text-primary" />
                ) : (
                  <ToggleLeft className="h-6 w-6" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-surface-light rounded-lg">
              <div className="flex items-center gap-3">
                <Book className="h-5 w-5 text-gray-400" />
                <span>Modo carrusel para manga</span>
              </div>
              <button
                onClick={() => setSettings({ 
                  ...settings,
                  mangaCarouselMode: !settings.mangaCarouselMode 
                })}
                className="text-gray-300 hover:text-white"
              >
                {settings.mangaCarouselMode ? (
                  <ToggleRight className="h-6 w-6 text-primary" />
                ) : (
                  <ToggleLeft className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}