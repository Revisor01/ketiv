import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { apiService } from '../../services/api';

interface EditableChurchEventProps {
  event: any;
  onUpdate: (updatedEvent: any) => void;
}

export const EditableChurchEvent: React.FC<EditableChurchEventProps> = ({ event, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedEvent, setEditedEvent] = useState(event);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    
    try {
      const response = await apiService.updateChurchEvent(editedEvent);
      if (response.success) {
        onUpdate(response.data);
        setIsEditing(false);
      } else {
        setError(response.error || 'Failed to update event');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedEvent(event);
    setIsEditing(false);
    setError(null);
  };

  const handleFieldChange = (field: string, value: string) => {
    setEditedEvent({ ...editedEvent, [field]: value });
  };

  const handlePerikopen = (reihe: string, value: string) => {
    const perikopen = { ...(editedEvent.perikopen || {}) };
    if (value.trim()) {
      perikopen[reihe] = value;
    } else {
      delete perikopen[reihe];
    }
    setEditedEvent({ ...editedEvent, perikopen });
  };

  const EditField: React.FC<{ field: string; label: string; value: string; multiline?: boolean }> = ({
    field, label, value, multiline = false
  }) => (
    <div className="mb-3">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {multiline ? (
        <textarea
          value={value || ''}
          onChange={(e) => handleFieldChange(field, e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royal-500"
          rows={2}
        />
      ) : (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => handleFieldChange(field, e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royal-500"
        />
      )}
    </div>
  );

  return (
    <div className="relative">
      {/* Edit Button */}
      {!isEditing && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsEditing(true)}
          className="absolute top-4 right-4 p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
          title="Bearbeiten"
        >
          <PencilIcon className="w-4 h-4 text-gray-600" />
        </motion.button>
      )}

      {isEditing ? (
        <div className="space-y-4">
          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCancel}
              disabled={saving}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
              title="Abbrechen"
            >
              <XMarkIcon className="w-4 h-4 text-gray-600" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSave}
              disabled={saving}
              className="p-2 rounded-lg bg-green-100 hover:bg-green-200 transition-colors disabled:opacity-50"
              title="Speichern"
            >
              <CheckIcon className="w-4 h-4 text-green-600" />
            </motion.button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Edit Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <EditField field="summary" label="Bezeichnung" value={editedEvent.summary} />
            <EditField field="liturgical_color" label="Liturgische Farbe" value={editedEvent.liturgical_color} />
            <EditField field="season" label="Kirchenjahreszeit" value={editedEvent.season} />
            <EditField field="weekly_verse_reference" label="Wochenspruch Referenz" value={editedEvent.weekly_verse_reference} />
            <div className="md:col-span-2">
              <EditField field="weekly_verse" label="Wochenspruch" value={editedEvent.weekly_verse} multiline />
            </div>
            <EditField field="psalm" label="Psalm" value={editedEvent.psalm} />
            <EditField field="old_testament_reading" label="AT-Lesung" value={editedEvent.old_testament_reading} />
            <EditField field="epistle" label="Epistel" value={editedEvent.epistle} />
            <EditField field="gospel" label="Evangelium" value={editedEvent.gospel} />
            <EditField field="sermon_text" label="Predigttext" value={editedEvent.sermon_text} />
            <EditField field="hymn1" label="Lied 1" value={editedEvent.hymn1} />
            <EditField field="hymn2" label="Lied 2" value={editedEvent.hymn2} />
            <EditField field="hymn1_eg" label="EG Nummer 1" value={editedEvent.hymn1_eg} />
            <EditField field="hymn2_eg" label="EG Nummer 2" value={editedEvent.hymn2_eg} />
          </div>

          {/* Perikopen */}
          <div className="mt-4">
            <h4 className="font-semibold text-gray-900 mb-3">Perikopenreihen</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {['I', 'II', 'III', 'IV', 'V', 'VI'].map(reihe => (
                <div key={reihe}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reihe {reihe}</label>
                  <input
                    type="text"
                    value={editedEvent.perikopen?.[reihe] || ''}
                    onChange={(e) => handlePerikopen(reihe, e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royal-500"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div>
          {/* Display content - existing event display */}
          {/* This will be passed as children or handled by parent component */}
        </div>
      )}
    </div>
  );
};