import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PlusIcon, TrashIcon, CheckIcon, XMarkIcon, PencilIcon } from '@heroicons/react/24/outline';
import { apiService } from '../../services/api';

interface Abbreviation {
  id?: number;
  book_name: string;
  abbreviations: string[];
}

export const BibleAbbreviations: React.FC = () => {
  const [abbreviations, setAbbreviations] = useState<Abbreviation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newBook, setNewBook] = useState({ book_name: '', abbreviations: '' });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAbbreviations();
  }, []);

  const loadAbbreviations = async () => {
    try {
      setLoading(true);
      // This would be replaced with actual API call
      const mockData: Abbreviation[] = [
        // Altes Testament
        { id: 1, book_name: '1. Mose', abbreviations: ['Gen', 'Genesis', '1Mo', '1M', '1Mose'] },
        { id: 2, book_name: '2. Mose', abbreviations: ['Ex', 'Exodus', '2Mo', '2M', '2Mose'] },
        { id: 3, book_name: '3. Mose', abbreviations: ['Lev', 'Levitikus', '3Mo', '3M', '3Mose'] },
        { id: 4, book_name: '4. Mose', abbreviations: ['Num', 'Numeri', '4Mo', '4M', '4Mose'] },
        { id: 5, book_name: '5. Mose', abbreviations: ['Dtn', 'Deuteronomium', '5Mo', '5M', '5Mose'] },
        { id: 6, book_name: 'Josua', abbreviations: ['Jos', 'Josh', 'Joshua'] },
        { id: 7, book_name: 'Richter', abbreviations: ['Ri', 'Richt', 'Judges', 'Jdg'] },
        { id: 8, book_name: 'Rut', abbreviations: ['Rut', 'Ruth', 'Ru'] },
        { id: 9, book_name: '1. Samuel', abbreviations: ['1Sam', '1. Sam', '1S', '1 Samuel'] },
        { id: 10, book_name: '2. Samuel', abbreviations: ['2Sam', '2. Sam', '2S', '2 Samuel'] },
        { id: 11, book_name: '1. Könige', abbreviations: ['1Kön', '1. Kön', '1K', '1 Kings', '1Kg'] },
        { id: 12, book_name: '2. Könige', abbreviations: ['2Kön', '2. Kön', '2K', '2 Kings', '2Kg'] },
        { id: 13, book_name: '1. Chronik', abbreviations: ['1Chr', '1. Chr', '1Ch', '1 Chronicles'] },
        { id: 14, book_name: '2. Chronik', abbreviations: ['2Chr', '2. Chr', '2Ch', '2 Chronicles'] },
        { id: 15, book_name: 'Esra', abbreviations: ['Esra', 'Esr', 'Ezra'] },
        { id: 16, book_name: 'Nehemia', abbreviations: ['Neh', 'Nehemia', 'Ne'] },
        { id: 17, book_name: 'Ester', abbreviations: ['Est', 'Ester', 'Esther'] },
        { id: 18, book_name: 'Hiob', abbreviations: ['Hiob', 'Job', 'Hi'] },
        { id: 19, book_name: 'Psalm', abbreviations: ['Ps', 'Psalm', 'Psalmen', 'Psa'] },
        { id: 20, book_name: 'Sprichwörter', abbreviations: ['Spr', 'Sprüche', 'Prov', 'Proverbs'] },
        { id: 21, book_name: 'Prediger', abbreviations: ['Pred', 'Koh', 'Kohelet', 'Eccl', 'Ecclesiastes'] },
        { id: 22, book_name: 'Hoheslied', abbreviations: ['Hld', 'Hohelied', 'Song', 'SoS', 'Cant'] },
        { id: 23, book_name: 'Jesaja', abbreviations: ['Jes', 'Jesaja', 'Isa', 'Isaiah'] },
        { id: 24, book_name: 'Jeremia', abbreviations: ['Jer', 'Jeremia', 'Jeremiah'] },
        { id: 25, book_name: 'Klagelieder', abbreviations: ['Klgl', 'Klag', 'Lam', 'Lamentations'] },
        { id: 26, book_name: 'Hesekiel', abbreviations: ['Hes', 'Ez', 'Ezechiel', 'Ezekiel'] },
        { id: 27, book_name: 'Daniel', abbreviations: ['Dan', 'Daniel', 'Da'] },
        { id: 28, book_name: 'Hosea', abbreviations: ['Hos', 'Hosea', 'Ho'] },
        { id: 29, book_name: 'Joel', abbreviations: ['Joel', 'Joe', 'Jl'] },
        { id: 30, book_name: 'Amos', abbreviations: ['Amos', 'Am'] },
        { id: 31, book_name: 'Obadja', abbreviations: ['Ob', 'Obad', 'Obadiah'] },
        { id: 32, book_name: 'Jona', abbreviations: ['Jona', 'Jon', 'Jonah'] },
        { id: 33, book_name: 'Micha', abbreviations: ['Mi', 'Mic', 'Micah'] },
        { id: 34, book_name: 'Nahum', abbreviations: ['Nah', 'Nahum', 'Na'] },
        { id: 35, book_name: 'Habakuk', abbreviations: ['Hab', 'Habakuk', 'Habakkuk'] },
        { id: 36, book_name: 'Zefanja', abbreviations: ['Zef', 'Zeph', 'Zephaniah'] },
        { id: 37, book_name: 'Haggai', abbreviations: ['Hag', 'Haggai', 'Hg'] },
        { id: 38, book_name: 'Sacharja', abbreviations: ['Sach', 'Zech', 'Zechariah'] },
        { id: 39, book_name: 'Maleachi', abbreviations: ['Mal', 'Maleachi', 'Malachi'] },
        
        // Neues Testament
        { id: 40, book_name: 'Matthäus', abbreviations: ['Mt', 'Matt', 'Matthew'] },
        { id: 41, book_name: 'Markus', abbreviations: ['Mk', 'Mark', 'Mr'] },
        { id: 42, book_name: 'Lukas', abbreviations: ['Lk', 'Luke', 'Lu'] },
        { id: 43, book_name: 'Johannes', abbreviations: ['Joh', 'John', 'Jn'] },
        { id: 44, book_name: 'Apostelgeschichte', abbreviations: ['Apg', 'Acts', 'Ac'] },
        { id: 45, book_name: 'Römer', abbreviations: ['Röm', 'Rom', 'Romans', 'Ro'] },
        { id: 46, book_name: '1. Korinther', abbreviations: ['1Kor', '1. Kor', '1Cor', '1 Corinthians'] },
        { id: 47, book_name: '2. Korinther', abbreviations: ['2Kor', '2. Kor', '2Cor', '2 Corinthians'] },
        { id: 48, book_name: 'Galater', abbreviations: ['Gal', 'Galater', 'Galatians'] },
        { id: 49, book_name: 'Epheser', abbreviations: ['Eph', 'Epheser', 'Ephesians'] },
        { id: 50, book_name: 'Philipper', abbreviations: ['Phil', 'Philipper', 'Philippians'] },
        { id: 51, book_name: 'Kolosser', abbreviations: ['Kol', 'Col', 'Colossians'] },
        { id: 52, book_name: '1. Thessalonicher', abbreviations: ['1Thess', '1. Thess', '1Th', '1 Thessalonians'] },
        { id: 53, book_name: '2. Thessalonicher', abbreviations: ['2Thess', '2. Thess', '2Th', '2 Thessalonians'] },
        { id: 54, book_name: '1. Timotheus', abbreviations: ['1Tim', '1. Tim', '1Ti', '1 Timothy'] },
        { id: 55, book_name: '2. Timotheus', abbreviations: ['2Tim', '2. Tim', '2Ti', '2 Timothy'] },
        { id: 56, book_name: 'Titus', abbreviations: ['Tit', 'Titus', 'Ti'] },
        { id: 57, book_name: 'Philemon', abbreviations: ['Phlm', 'Phm', 'Philemon'] },
        { id: 58, book_name: 'Hebräer', abbreviations: ['Hebr', 'Heb', 'Hebrews'] },
        { id: 59, book_name: 'Jakobus', abbreviations: ['Jak', 'Jas', 'James'] },
        { id: 60, book_name: '1. Petrus', abbreviations: ['1Petr', '1. Petr', '1Pet', '1 Peter'] },
        { id: 61, book_name: '2. Petrus', abbreviations: ['2Petr', '2. Petr', '2Pet', '2 Peter'] },
        { id: 62, book_name: '1. Johannes', abbreviations: ['1Joh', '1. Joh', '1Jn', '1 John'] },
        { id: 63, book_name: '2. Johannes', abbreviations: ['2Joh', '2. Joh', '2Jn', '2 John'] },
        { id: 64, book_name: '3. Johannes', abbreviations: ['3Joh', '3. Joh', '3Jn', '3 John'] },
        { id: 65, book_name: 'Judas', abbreviations: ['Jud', 'Jude', 'Ju'] },
        { id: 66, book_name: 'Offenbarung', abbreviations: ['Offb', 'Apk', 'Rev', 'Revelation'] },
      ];
      setAbbreviations(mockData);
    } catch (err) {
      setError('Failed to load abbreviations');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    if (!newBook.book_name || !newBook.abbreviations) return;
    
    const abbrevArray = newBook.abbreviations.split(',').map(a => a.trim()).filter(a => a);
    const newAbbrev: Abbreviation = {
      book_name: newBook.book_name,
      abbreviations: abbrevArray
    };
    
    setAbbreviations([...abbreviations, newAbbrev]);
    setNewBook({ book_name: '', abbreviations: '' });
  };

  const handleDelete = (id: number | undefined) => {
    if (!id) return;
    setAbbreviations(abbreviations.filter(a => a.id !== id));
  };

  const handleEdit = (abbrev: Abbreviation) => {
    setEditingId(abbrev.id || null);
  };

  const handleUpdate = (abbrev: Abbreviation, newAbbrevs: string) => {
    const abbrevArray = newAbbrevs.split(',').map(a => a.trim()).filter(a => a);
    const updated = abbreviations.map(a => 
      a.id === abbrev.id ? { ...a, abbreviations: abbrevArray } : a
    );
    setAbbreviations(updated);
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="font-heading text-lg font-semibold text-gray-900 mb-4">
          Bibel-Abkürzungen verwalten
        </h3>
        
        <p className="text-sm text-gray-600 mb-6">
          Hier können Sie die Abkürzungen für Bibelbücher verwalten. Diese werden für die Bibelstellen-Suche verwendet.
        </p>

        {/* Add new book */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-3">Neues Buch hinzufügen</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Buchname (z.B. 1. Mose)"
              value={newBook.book_name}
              onChange={(e) => setNewBook({ ...newBook, book_name: e.target.value })}
              className="input-field"
            />
            <input
              type="text"
              placeholder="Abkürzungen (kommagetrennt)"
              value={newBook.abbreviations}
              onChange={(e) => setNewBook({ ...newBook, abbreviations: e.target.value })}
              className="input-field"
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAdd}
              disabled={!newBook.book_name || !newBook.abbreviations}
              className="btn-primary disabled:opacity-50"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Hinzufügen
            </motion.button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Beispiel Abkürzungen: Gen, Genesis, 1Mo, 1M, 1Mose
          </p>
        </div>

        {/* Abbreviations list */}
        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-royal-600 border-t-transparent rounded-full mx-auto"></div>
            </div>
          ) : (
            <>
              {/* Altes Testament */}
              <div>
                <h4 className="font-medium text-blue-900 mb-3 border-b border-blue-200 pb-2">
                  Altes Testament
                </h4>
                <div className="space-y-2">
                  {abbreviations.filter(abbrev => abbrev.id! <= 39).map((abbrev) => (
                <motion.div
                  key={abbrev.id || abbrev.book_name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center space-x-4 p-3 bg-white border border-gray-200 rounded-lg"
                >
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900">{abbrev.book_name}</h5>
                    {editingId === abbrev.id ? (
                      <div className="flex items-center space-x-2 mt-2">
                        <input
                          type="text"
                          defaultValue={abbrev.abbreviations.join(', ')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleUpdate(abbrev, (e.target as HTMLInputElement).value);
                            }
                          }}
                          className="flex-1 input-field text-sm"
                          autoFocus
                        />
                        <button
                          onClick={(e) => {
                            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                            handleUpdate(abbrev, input.value);
                          }}
                          className="p-1.5 rounded bg-green-100 hover:bg-green-200"
                        >
                          <CheckIcon className="w-4 h-4 text-green-600" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1.5 rounded bg-gray-100 hover:bg-gray-200"
                        >
                          <XMarkIcon className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {abbrev.abbreviations.map((a, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleEdit(abbrev)}
                      className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                      <PencilIcon className="w-4 h-4 text-gray-600" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleDelete(abbrev.id)}
                      className="p-2 rounded-lg bg-red-100 hover:bg-red-200 transition-colors"
                    >
                      <TrashIcon className="w-4 h-4 text-red-600" />
                    </motion.button>
                  </div>
                </motion.div>
                  ))}
                </div>
              </div>

              {/* Neues Testament */}
              <div>
                <h4 className="font-medium text-blue-900 mb-3 border-b border-blue-200 pb-2">
                  Neues Testament
                </h4>
                <div className="space-y-2">
                  {abbreviations.filter(abbrev => abbrev.id! >= 40).map((abbrev) => (
                <motion.div
                  key={abbrev.id || abbrev.book_name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center space-x-4 p-3 bg-white border border-gray-200 rounded-lg"
                >
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900">{abbrev.book_name}</h5>
                    {editingId === abbrev.id ? (
                      <div className="flex items-center space-x-2 mt-2">
                        <input
                          type="text"
                          defaultValue={abbrev.abbreviations.join(', ')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleUpdate(abbrev, (e.target as HTMLInputElement).value);
                            }
                          }}
                          className="flex-1 input-field text-sm"
                          autoFocus
                        />
                        <button
                          onClick={(e) => {
                            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                            handleUpdate(abbrev, input.value);
                          }}
                          className="p-1.5 rounded bg-green-100 hover:bg-green-200"
                        >
                          <CheckIcon className="w-4 h-4 text-green-600" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1.5 rounded bg-gray-100 hover:bg-gray-200"
                        >
                          <XMarkIcon className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {abbrev.abbreviations.map((abbrev_text, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                          >
                            {abbrev_text}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleEdit(abbrev)}
                      className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                      <PencilIcon className="w-4 h-4 text-gray-600" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleDelete(abbrev.id)}
                      className="p-2 rounded-lg bg-red-100 hover:bg-red-200 transition-colors"
                    >
                      <TrashIcon className="w-4 h-4 text-red-600" />
                    </motion.button>
                  </div>
                </motion.div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Hinweis für BIGS-URLs</h4>
        <p className="text-sm text-blue-800">
          Die Abkürzungen für die "Bibel in gerechter Sprache" (BIGS) sind fest einprogrammiert, 
          da sie für die korrekte URL-Generierung und das Scraping benötigt werden.
        </p>
      </div>
    </div>
  );
};