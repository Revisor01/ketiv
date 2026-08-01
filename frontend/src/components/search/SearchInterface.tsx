import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MagnifyingGlassIcon, BookOpenIcon, ClockIcon, CalendarIcon, EyeIcon, EyeSlashIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { TranslationSelector } from '../bible/TranslationSelector';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';
import { apiService } from '../../services/api';
import { BibleSearchRequest, BibleSearchResult } from '../../types';
import { BibleReferenceParser } from '../../utils/bibleParser';
import { ICSParser, ChurchEvent } from '../../utils/icsParser';
import { useLocation } from 'react-router-dom';

export const SearchInterface: React.FC = () => {
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTranslation, setSelectedTranslation] = useState('LUT');
  const [searchResult, setSearchResult] = useState<BibleSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [nextEvent, setNextEvent] = useState<ChurchEvent | null>(null);
  const [showExcludedVerses, setShowExcludedVerses] = useState(true);
  const [showOptionalVerses, setShowOptionalVerses] = useState(true);

  // Kopier-Optionen
  const [copyWithVerseNumbers, setCopyWithVerseNumbers] = useState(false);
  const [copyWithReference, setCopyWithReference] = useState(true);

  // Vergleichsmodus: bis zu 3 Übersetzungen nebeneinander
  const [compareMode, setCompareMode] = useState(false);
  const [compareTranslation2, setCompareTranslation2] = useState('HFA');
  const [compareTranslation3, setCompareTranslation3] = useState('BIGS');
  const [compareResults, setCompareResults] = useState<Array<{
    code: string;
    result?: BibleSearchResult;
    error?: string;
  }> | null>(null);

  const availableTranslations = apiService.getAvailableTranslations();

  // Beispiel-Suchen für bessere UX (jetzt aus Parser)
  const exampleSearches = BibleReferenceParser.getExamples();

  // Helper Funktion für Bibelserver URLs
  const generateBibleserverUrl = (reference: string, translation: string) => {
    const encodedRef = encodeURIComponent(reference.replace(/\s+/g, '+'));
    return `https://www.bibleserver.com/${translation}/${encodedRef}`;
  };

  // Helper Funktion um bestimmte Worte hervorzuheben
  const formatBibleText = (text: string) => {
    const wordsToHighlight = ['Gott', 'Gottes', 'HERR', 'HERRn', 'HERRN', 'Jesus', 'Christus', 'Geist', 'Heiligen Geist', 'Heiliger Geist', 'Sohn', 'Adonaj'];
    let formattedText = text;
    
    // 1. Entferne Zahlen-Referenzen aus Sela: Sela(↑397) -> Sela
    formattedText = formattedText.replace(/Sela\([^)]*\)/g, 'Sela');
    
    // 2. Mache Sela kursiv
    formattedText = formattedText.replace(/\bSela\b/g, '<em>Sela</em>');
    
    // 3. Entferne ALLE Zahlen-Referenzen: (409), (↑123), etc.
    formattedText = formattedText.replace(/\([↑]?\d+\)/g, '');
    
    // 4. Bestimmte Worte hervorheben
    wordsToHighlight.forEach(word => {
      const regex = new RegExp(`\\b(${word})\\b`, 'gi'); // 'gi' für case-insensitive
      formattedText = formattedText.replace(regex, '<span class="font-bold text-lg">$1</span>');
    });
    
    return <span dangerouslySetInnerHTML={{ __html: formattedText }} />;
  };

  // Load URL parameters and next church event
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const refParam = urlParams.get('ref');
    if (refParam) {
      setSearchTerm(refParam);
      // Auto-search if we have a reference from URL
      if (refParam.trim()) {
        handleSearchDirect(refParam);
      }
    }

    // Load next church event
    loadNextChurchEvent();
  }, [location.search]); // Wichtig: location.search statt location, damit es bei URL-Änderungen reagiert

  const loadNextChurchEvent = async () => {
    try {
      const response = await apiService.getNextChurchEvent();
      if (response.success && response.data && response.data.length > 0) {
        const event = response.data[0];
        // Convert to ChurchEvent format
        const churchEvent: ChurchEvent = {
          uid: event.uid,
          summary: event.summary,
          description: '', // No longer stored in database
          date: new Date(event.event_date),
          url: event.url,
          liturgicalColor: event.liturgical_color,
          season: event.season,
          weeklyVerse: event.weekly_verse,
          weeklyVerseReference: event.weekly_verse_reference,
          psalm: event.psalm,
          oldTestamentReading: event.old_testament_reading,
          epistle: event.epistle,
          gospel: event.gospel,
          sermonText: event.sermon_text,
          hymn: event.hymn,
          perikopen: event.perikopen
        };
        setNextEvent(churchEvent);
      }
    } catch (error) {
      console.error('Failed to load church events:', error);
    }
  };

  const handleInputChange = (value: string) => {
    setSearchTerm(value);
    
    // Suggestions anzeigen
    if (value.length >= 2) {
      const bookSuggestions = BibleReferenceParser.getSuggestions(value);
      setSuggestions(bookSuggestions);
      setShowSuggestions(bookSuggestions.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSearchDirect = async (term: string) => {
    if (!term.trim()) return;

    setLoading(true);
    setError(null);
    setShowSuggestions(false);

    try {
      if (compareMode) {
        // Bis zu 3 Übersetzungen parallel laden (leere Auswahl und Duplikate entfernen)
        const codes = Array.from(new Set([
          selectedTranslation,
          compareTranslation2,
          compareTranslation3
        ].filter(Boolean))).slice(0, 3);

        const results = await Promise.all(codes.map(async (code) => {
          try {
            const response = await apiService.searchBibleText({
              reference: term.trim(),
              translation: code,
              format: 'json'
            });
            if (response.success && response.data) {
              return { code, result: response.data };
            }
            return { code, error: response.error || 'Fehler bei der Suche' };
          } catch (err) {
            return { code, error: err instanceof Error ? err.message : 'Unbekannter Fehler' };
          }
        }));

        if (results.every(r => r.error)) {
          setError(results[0].error || 'Fehler bei der Suche');
          setCompareResults(null);
        } else {
          setCompareResults(results);
          setSearchResult(null);
          const newHistory = [term.trim(), ...searchHistory.filter(h => h !== term.trim())].slice(0, 5);
          setSearchHistory(newHistory);
        }
        return;
      }

      const request: BibleSearchRequest = {
        reference: term.trim(),
        translation: selectedTranslation,
        format: 'json'
      };

      const response = await apiService.searchBibleText(request);

      if (response.success && response.data) {
        setSearchResult(response.data);
        setCompareResults(null);

        // Update search history
        const newHistory = [term.trim(), ...searchHistory.filter(h => h !== term.trim())].slice(0, 5);
        setSearchHistory(newHistory);
      } else {
        setError(response.error || 'Fehler bei der Suche');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchTerm.trim()) return;

    await handleSearchDirect(searchTerm);
  };

  const handleExampleClick = (example: string) => {
    setSearchTerm(example);
  };

  const handleHistoryClick = (historyItem: string) => {
    setSearchTerm(historyItem);
  };

  const clearSearch = () => {
    setSearchResult(null);
    setCompareResults(null);
    setError(null);
    setSearchTerm('');
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-8 mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-heading text-3xl font-bold text-gray-900 mb-2">
                Bibeltext-Suche
              </h1>
              <p className="text-gray-600">
                Suche nach beliebigen Bibelversen in verschiedenen Übersetzungen
              </p>
            </div>
            <div className="text-right">
              <BookOpenIcon className="w-12 h-12 text-royal-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Bibelsuche</p>
            </div>
          </div>
        </motion.div>

        {/* Search Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-6 mb-8 relative z-30"
        >
          <form onSubmit={handleSearch} className="space-y-6">
            {/* Search Input */}
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Bibelstelle eingeben
              </label>
              <div className="relative">
                <input
                  id="search"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="z.B. Johannes 3,16 oder Psalm 23,1-6"
                  className="input-field pl-10 text-lg"
                  disabled={loading}
                />
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </div>

            {/* Translation Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  {compareMode ? 'Übersetzung 1' : 'Übersetzung'}
                </label>
                <label className="flex items-center space-x-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={compareMode}
                    onChange={(e) => {
                      setCompareMode(e.target.checked);
                      setSearchResult(null);
                      setCompareResults(null);
                    }}
                    className="rounded border-gray-300"
                  />
                  <span>Übersetzungen vergleichen (nebeneinander)</span>
                </label>
              </div>
              <TranslationSelector
                selected={selectedTranslation}
                onSelect={setSelectedTranslation}
                available={availableTranslations}
              />

              {compareMode && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Übersetzung 2
                    </label>
                    <TranslationSelector
                      selected={compareTranslation2}
                      onSelect={setCompareTranslation2}
                      available={availableTranslations}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Übersetzung 3 <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <TranslationSelector
                      selected={compareTranslation3}
                      onSelect={setCompareTranslation3}
                      available={availableTranslations}
                      allowNone
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-between">
              <button
                type="submit"
                disabled={loading || !searchTerm.trim()}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Suche...
                  </>
                ) : (
                  <>
                    <MagnifyingGlassIcon className="w-5 h-5 mr-2" />
                    Suchen
                  </>
                )}
              </button>

              {(searchResult || compareResults || error) && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="btn-secondary"
                >
                  Neue Suche
                </button>
              )}
            </div>
          </form>
        </motion.div>

        {/* Next Church Event */}
        {nextEvent && !searchResult && !compareResults && !error && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="card p-6 mb-8 bg-gradient-to-r from-blue-50 to-purple-50"
          >
            <div className="flex items-start space-x-4">
              <CalendarIcon className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-heading text-lg font-semibold text-gray-900">
                    Nächster Feiertag: {nextEvent.summary}
                  </h3>
                  <span className="text-sm text-gray-500">
                    {ICSParser.formatDate(nextEvent.date)}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
                  {nextEvent.psalm && (
                    <button
                      onClick={() => {
                        setSearchTerm(nextEvent.psalm!);
                        handleSearchDirect(nextEvent.psalm!);
                      }}
                      className="bg-white/60 hover:bg-white/80 rounded-lg p-3 text-left transition-colors group"
                    >
                      <div className="text-xs text-gray-600 mb-1">Psalm</div>
                      <div className="text-sm font-medium text-blue-900 group-hover:text-blue-700">
                        {nextEvent.psalm}
                      </div>
                    </button>
                  )}
                  
                  {nextEvent.oldTestamentReading && (
                    <button
                      onClick={() => {
                        setSearchTerm(nextEvent.oldTestamentReading!);
                        handleSearchDirect(nextEvent.oldTestamentReading!);
                      }}
                      className="bg-white/60 hover:bg-white/80 rounded-lg p-3 text-left transition-colors group"
                    >
                      <div className="text-xs text-gray-600 mb-1">AT-Lesung</div>
                      <div className="text-sm font-medium text-blue-900 group-hover:text-blue-700">
                        {nextEvent.oldTestamentReading}
                      </div>
                    </button>
                  )}
                  
                  {nextEvent.epistle && (
                    <button
                      onClick={() => {
                        setSearchTerm(nextEvent.epistle!);
                        handleSearchDirect(nextEvent.epistle!);
                      }}
                      className="bg-white/60 hover:bg-white/80 rounded-lg p-3 text-left transition-colors group"
                    >
                      <div className="text-xs text-gray-600 mb-1">Epistel</div>
                      <div className="text-sm font-medium text-blue-900 group-hover:text-blue-700">
                        {nextEvent.epistle}
                      </div>
                    </button>
                  )}
                  
                  {nextEvent.gospel && (
                    <button
                      onClick={() => {
                        setSearchTerm(nextEvent.gospel!);
                        handleSearchDirect(nextEvent.gospel!);
                      }}
                      className="bg-white/60 hover:bg-white/80 rounded-lg p-3 text-left transition-colors group"
                    >
                      <div className="text-xs text-gray-600 mb-1">Evangelium</div>
                      <div className="text-sm font-medium text-blue-900 group-hover:text-blue-700">
                        {nextEvent.gospel}
                      </div>
                    </button>
                  )}
                  
                  {nextEvent.sermonText && (
                    <button
                      onClick={() => {
                        setSearchTerm(nextEvent.sermonText!);
                        handleSearchDirect(nextEvent.sermonText!);
                      }}
                      className="bg-white/60 hover:bg-white/80 rounded-lg p-3 text-left transition-colors group"
                    >
                      <div className="text-xs text-gray-600 mb-1">Predigttext</div>
                      <div className="text-sm font-medium text-blue-900 group-hover:text-blue-700">
                        {nextEvent.sermonText}
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Example Searches */}
        {!searchResult && !compareResults && !error && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <h3 className="font-heading text-lg font-semibold text-gray-900 mb-4">
              Beispiel-Suchen
            </h3>
            <div className="flex flex-wrap gap-2">
              {exampleSearches.map((example, index) => (
                <motion.button
                  key={example}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleExampleClick(example)}
                  className="px-3 py-2 bg-royal-50 text-royal-700 rounded-lg text-sm font-medium hover:bg-royal-100 transition-colors"
                >
                  {example}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Search History */}
        {searchHistory.length > 0 && !searchResult && !compareResults && !error && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <div className="flex items-center mb-4">
              <ClockIcon className="w-5 h-5 text-gray-400 mr-2" />
              <h3 className="font-heading text-lg font-semibold text-gray-900">
                Letzte Suchen
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {searchHistory.map((item, index) => (
                <motion.button
                  key={`${item}-${index}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleHistoryClick(item)}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  {item}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Error State */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ErrorMessage
                message={error}
                onRetry={() => handleSearch({ preventDefault: () => {} } as any)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search Result */}
        <AnimatePresence>
          {searchResult && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="space-y-6"
            >
              {/* Result Header */}
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-2xl font-semibold text-gray-900">
                  Suchergebnis
                </h2>
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-500">
                    {searchResult.translation?.name} ({searchResult.translation?.code})
                  </div>
                  <a 
                    href={searchResult.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 px-3 py-2 bg-royal-100 hover:bg-royal-200 rounded-lg text-royal-700 transition-colors"
                    title="Vollständige Bibelstelle öffnen"
                  >
                    <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {searchResult.translation?.code === 'BIGS' ? 'BiGS' : 'Bibelserver'}
                    </span>
                  </a>
                </div>
              </div>

              {/* Haupttext-Anzeige für Einzelverse (kein verses-Array von der API) */}
              {(!searchResult.verses || searchResult.verses.length <= 1) && searchResult.text && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="card p-6"
                >
                  <blockquote className="text-xl leading-relaxed text-gray-800 font-serif">
                    {formatBibleText(searchResult.text)}
                  </blockquote>
                  <p className="mt-4 text-sm text-gray-500">
                    {searchResult.reference} — {searchResult.translation?.name}
                  </p>
                </motion.div>
              )}

              {/* Multiple Verses Display - Moved to top */}
              {searchResult.verses && searchResult.verses.length > 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="card p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-heading text-lg font-semibold text-gray-900">
                      Einzelverse im Detail
                    </h3>
                    <div className="flex items-center space-x-2">
                      {/* Toggle für ausgeschlossene Verse */}
                      {searchResult.verses.some(verse => verse.excluded) && (
                        <button
                          onClick={() => setShowExcludedVerses(!showExcludedVerses)}
                          className="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors"
                          title={showExcludedVerses ? 'Ausgeschlossene Verse ausblenden' : 'Ausgeschlossene Verse anzeigen'}
                        >
                          {showExcludedVerses ? (
                            <EyeSlashIcon className="w-4 h-4" />
                          ) : (
                            <EyeIcon className="w-4 h-4" />
                          )}
                          <span>
                            {showExcludedVerses ? 'Ausgeschlossene ausblenden' : 'Ausgeschlossene anzeigen'}
                          </span>
                        </button>
                      )}
                      
                      {/* Toggle für optionale Verse */}
                      {searchResult.verses.some(verse => verse.optional) && (
                        <button
                          onClick={() => setShowOptionalVerses(!showOptionalVerses)}
                          className="flex items-center space-x-2 px-3 py-2 bg-blue-100 hover:bg-blue-200 rounded-lg text-sm text-blue-700 transition-colors"
                          title={showOptionalVerses ? 'Optionale Verse ausblenden' : 'Optionale Verse anzeigen'}
                        >
                          {showOptionalVerses ? (
                            <EyeSlashIcon className="w-4 h-4" />
                          ) : (
                            <EyeIcon className="w-4 h-4" />
                          )}
                          <span>
                            {showOptionalVerses ? 'Optionale ausblenden' : 'Optionale anzeigen'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-4">
                    {searchResult.verses.map((verse, index) => {
                      // Zeige ausgeschlossene Verse nur wenn Toggle aktiviert ist
                      if (verse.excluded && !showExcludedVerses) {
                        return null;
                      }
                      
                      // Zeige optionale Verse nur wenn Toggle aktiviert ist
                      if (verse.optional && !showOptionalVerses) {
                        return null;
                      }
                      
                      return (
                        <motion.div
                          key={verse.number}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + index * 0.1 }}
                          className={`flex space-x-4 py-3 border-b border-gray-100 last:border-b-0 ${
                            verse.excluded 
                              ? 'opacity-50 bg-gray-50 rounded-lg px-3 border-l-4 border-orange-300' 
                              : verse.optional
                              ? 'bg-blue-50 rounded-lg px-3 border-l-4 border-blue-300'
                              : ''
                          }`}
                        >
                          <span 
                            className={`flex-shrink-0 min-w-[2rem] h-8 px-2 rounded-full flex items-center justify-center text-sm font-semibold ${
                              verse.excluded 
                                ? 'bg-orange-100 text-orange-700'
                                : verse.optional
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-royal-100 text-royal-700'
                            }`}
                            title={verse.suffix ? `Vers ${verse.number}${verse.suffix} - nur Teil "${verse.suffix}" des Verses` : undefined}
                          >
                            {verse.number}{verse.suffix && <span className="text-xs ml-0.5">{verse.suffix}</span>}
                          </span>
                          <p className={`flex-1 leading-relaxed ${
                            verse.excluded 
                              ? 'text-gray-500 italic'
                              : verse.optional
                              ? 'text-blue-700 italic'
                              : 'text-gray-700'
                          }`}>
                            {formatBibleText(verse.text || (verse.excluded ? '— Vers konnte nicht geladen werden —' : ''))}
                          </p>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Copy Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="card p-6"
              >
                <h3 className="font-heading text-lg font-semibold text-gray-900 mb-4">
                  In Zwischenablage kopieren
                </h3>
                <div className="text-sm text-gray-600 mb-4">
                  Text wird entsprechend den Sichtbarkeits-Einstellungen kopiert (ausgeschlossene/optionale Verse werden nur kopiert wenn sie angezeigt werden).
                </div>

                {/* Optionen für Zwischenablage */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-700">Für Zwischenablage:</div>
                  <label className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={copyWithReference}
                      onChange={(e) => setCopyWithReference(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span>Referenz als Überschrift</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={copyWithVerseNumbers}
                      onChange={(e) => setCopyWithVerseNumbers(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span>Versnummern</span>
                  </label>
                  {searchResult?.verses?.some(v => v.excluded) && (
                    <label className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={showExcludedVerses}
                        onChange={(e) => setShowExcludedVerses(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <span>Ausgeschlossene Verse</span>
                    </label>
                  )}
                  {searchResult?.verses?.some(v => v.optional) && (
                    <label className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={showOptionalVerses}
                        onChange={(e) => setShowOptionalVerses(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <span>Optionale Verse</span>
                    </label>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { format: 'text', label: 'Text' },
                    { format: 'markdown', label: 'Markdown' },
                    { format: 'html', label: 'HTML' },
                    { format: 'json', label: 'JSON' }
                  ].map(({ format, label }) => (
                    <button
                      key={format}
                      onClick={() => {
                        // Helper: Text bereinigen (Zahlen-Referenzen entfernen, Formatierung anwenden)
                        const cleanText = (text: string) => {
                          let cleaned = text;
                          // Entferne Zahlen-Referenzen wie in formatBibleText
                          cleaned = cleaned.replace(/Sela\([^)]*\)/g, 'Sela');
                          cleaned = cleaned.replace(/\([↑]?\d+\)/g, '');
                          return cleaned.trim();
                        };

                        // Versnummern hochgestellt (Unicode für Text/Markdown, <sup> für HTML)
                        const toSuperscript = (s: string) => {
                          const map: Record<string, string> = {
                            '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
                            '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
                            'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ'
                          };
                          return s.split('').map(c => map[c] ?? c).join('');
                        };

                        // Generiere gefilterten Text basierend auf Toggle-Settings
                        let plainText = '';
                        let htmlText = '';
                        if (searchResult.verses && searchResult.verses.length > 0) {
                          const visibleVerses = searchResult.verses.filter(verse => {
                            if (verse.excluded && !showExcludedVerses) return false;
                            if (verse.optional && !showOptionalVerses) return false;
                            return true;
                          });
                          plainText = visibleVerses
                            .map(v => {
                              const text = cleanText(v.text || '');
                              const label = `${v.number}${v.suffix || ''}`;
                              return copyWithVerseNumbers ? `${toSuperscript(label)}${text}` : text;
                            })
                            .join(' ');
                          htmlText = visibleVerses
                            .map(v => {
                              const text = cleanText(v.text || '');
                              const label = `${v.number}${v.suffix || ''}`;
                              return copyWithVerseNumbers ? `<sup>${label}</sup>${text}` : text;
                            })
                            .join(' ');
                        } else {
                          plainText = htmlText = cleanText(searchResult.text);
                        }

                        const heading = `${searchResult.reference} (${searchResult.translation?.name || searchResult.translation?.code})`;

                        const content = format === 'text' ? (copyWithReference ? `${heading}\n\n${plainText}` : plainText) :
                                      format === 'markdown' ? (copyWithReference
                                        ? `## ${searchResult.reference}\n\n> ${plainText}\n\n*— ${searchResult.translation?.name}*`
                                        : `> ${plainText}\n\n*— ${searchResult.translation?.name}*`) :
                                      format === 'html' ? (copyWithReference
                                        ? `<div class="bible-verse">\n  <h3>${searchResult.reference}</h3>\n  <blockquote>${htmlText}</blockquote>\n  <footer>${searchResult.translation?.name}</footer>\n</div>`
                                        : `<div class="bible-verse">\n  <blockquote>${htmlText}</blockquote>\n  <footer>${searchResult.translation?.name}</footer>\n</div>`) :
                                      JSON.stringify(searchResult, null, 2);
                        navigator.clipboard.writeText(content);
                      }}
                      className="btn-secondary text-sm py-3 hover:bg-royal-50 hover:text-royal-700 transition-colors"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Comparison Result: bis zu 3 Übersetzungen nebeneinander */}
        <AnimatePresence>
          {compareResults && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="font-heading text-2xl font-semibold text-gray-900">
                  Übersetzungsvergleich
                  {(() => {
                    const first = compareResults.find(r => r.result);
                    return first?.result?.reference ? `: ${first.result.reference}` : '';
                  })()}
                </h2>
                <div className="flex items-center space-x-4">
                  {compareResults.some(r => r.result?.verses?.some(v => v.excluded)) && (
                    <label className="flex items-center space-x-2 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={showExcludedVerses}
                        onChange={(e) => setShowExcludedVerses(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <span>Ausgeschlossene Verse</span>
                    </label>
                  )}
                  {compareResults.some(r => r.result?.verses?.some(v => v.optional)) && (
                    <label className="flex items-center space-x-2 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={showOptionalVerses}
                        onChange={(e) => setShowOptionalVerses(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <span>Optionale Verse</span>
                    </label>
                  )}
                  <div className="text-sm text-gray-500">
                    {compareResults.length} Übersetzungen
                  </div>
                </div>
              </div>

              <div className={`grid grid-cols-1 gap-4 ${
                compareResults.length === 3
                  ? 'lg:grid-cols-3 md:grid-cols-2'
                  : compareResults.length === 2
                  ? 'md:grid-cols-2'
                  : ''
              }`}>
                {compareResults.map(({ code, result, error: colError }, index) => {
                  const translationInfo = availableTranslations.find(t => t.code === code);

                  return (
                    <motion.div
                      key={code}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + index * 0.1 }}
                      className="card p-6 flex flex-col"
                    >
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                        <div>
                          <h3 className="font-heading font-semibold text-gray-900">
                            {translationInfo?.name || code}
                          </h3>
                          <span className="text-xs text-gray-500">{code}</span>
                        </div>
                        {result?.url && (
                          <a
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-royal-50 hover:bg-royal-100 text-royal-700 transition-colors"
                            title="Auf Bibelserver öffnen"
                          >
                            <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                          </a>
                        )}
                      </div>

                      {colError && (
                        <p className="text-sm text-red-600">
                          Konnte nicht geladen werden: {colError}
                        </p>
                      )}

                      {result && (
                        <>
                          <div className="flex-1 space-y-3 text-gray-700 leading-relaxed">
                            {result.verses && result.verses.length > 0 ? (
                              result.verses.map((verse) => {
                                if (verse.excluded && !showExcludedVerses) return null;
                                if (verse.optional && !showOptionalVerses) return null;

                                return (
                                  <p
                                    key={verse.number}
                                    className={
                                      verse.excluded
                                        ? 'opacity-50 italic text-gray-500 bg-gray-50 rounded-lg px-2 py-1 border-l-4 border-orange-300'
                                        : verse.optional
                                        ? 'italic text-blue-700 bg-blue-50 rounded-lg px-2 py-1 border-l-4 border-blue-300'
                                        : ''
                                    }
                                  >
                                    <span className={`text-xs font-semibold mr-1 align-super ${
                                      verse.excluded
                                        ? 'text-orange-500'
                                        : verse.optional
                                        ? 'text-blue-500'
                                        : 'text-royal-500'
                                    }`}>
                                      {verse.number}{verse.suffix || ''}
                                    </span>
                                    {formatBibleText(verse.text || (verse.excluded ? '— Vers ausgelassen —' : ''))}
                                  </p>
                                );
                              })
                            ) : (
                              <p>{formatBibleText(result.text)}</p>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              const text = result.verses && result.verses.length > 0
                                ? result.verses
                                    .filter(v => !(v.excluded && !showExcludedVerses) && !(v.optional && !showOptionalVerses) && !v.excluded)
                                    .map(v => v.text || '').join(' ')
                                : result.text;
                              navigator.clipboard.writeText(
                                `${result.reference} (${code}): ${text}`
                              );
                            }}
                            className="btn-secondary text-sm mt-4 self-start"
                          >
                            Kopieren
                          </button>
                        </>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};