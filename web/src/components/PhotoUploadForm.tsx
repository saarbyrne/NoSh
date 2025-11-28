"use client";
import { useState } from "react";
import { Calendar, Camera, FileText, CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";

interface Photo {
  id: string;
  url: string;
  file?: File;
}

interface PhotoUploadFormProps {
  onFinishDay?: (photos: Photo[], notes: string, date: Date) => void;
  onPhotoUpload?: (file: File) => Promise<Photo>;
  onPhotoDelete?: (photoId: string) => void;
}

export default function PhotoUploadForm({
  onFinishDay,
  onPhotoUpload,
  onPhotoDelete,
}: PhotoUploadFormProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [notes, setNotes] = useState("");
  const [isNotesFocused, setIsNotesFocused] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  const readyPhotos = photos.length;
  const hasMinimum = readyPhotos >= 3;
  const allPhotosUploaded = readyPhotos >= 3;

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today, " + format(date, "EEEE, MMM d");
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday, " + format(date, "EEEE, MMM d");
    } else {
      return format(date, "EEEE, MMM d");
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setIsCalendarOpen(false);
    }
  };

  const handleAddPhoto = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment"; // Prefer rear camera on mobile
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !onPhotoUpload) return;

      const tempId = `temp-${Date.now()}`;
      setIsUploading(true);
      setUploadProgress(prev => ({ ...prev, [tempId]: 0 }));
      setUploadErrors(prev => {
        const { [tempId]: _, ...rest } = prev;
        return rest;
      });

      try {
        // Simulate progress for better UX
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            const current = prev[tempId] || 0;
            if (current < 90) {
              return { ...prev, [tempId]: current + 10 };
            }
            return prev;
          });
        }, 100);

        const photo = await onPhotoUpload(file);
        
        clearInterval(progressInterval);
        setUploadProgress(prev => ({ ...prev, [tempId]: 100 }));
        
        // Small delay to show completion
        setTimeout(() => {
          setPhotos(prev => [...prev, photo]);
          setUploadProgress(prev => {
            const { [tempId]: _, ...rest } = prev;
            return rest;
          });
        }, 200);

      } catch (error) {
        console.error("Failed to upload photo:", error);
        setUploadErrors(prev => ({ 
          ...prev, 
          [tempId]: error instanceof Error ? error.message : "Upload failed" 
        }));
        setUploadProgress(prev => {
          const { [tempId]: _, ...rest } = prev;
          return rest;
        });
      } finally {
        setIsUploading(false);
      }
    };

    input.click();
  };

  const handleDeletePhoto = (photoId: string) => {
    setPhotos(prev => prev.filter(p => p.id !== photoId));
    onPhotoDelete?.(photoId);
  };

  const handleFinishDay = async () => {
    if (onFinishDay && hasMinimum) {
      setIsProcessing(true);
      try {
        await onFinishDay(photos, notes, selectedDate);
      } catch (error) {
        console.error("Failed to finish day:", error);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const PhotoCard = ({ photo, onDelete, showProgress = false, progress = 0, error }: { 
    photo: Photo; 
    onDelete: () => void;
    showProgress?: boolean;
    progress?: number;
    error?: string;
  }) => (
    <Card className="aspect-square relative group overflow-hidden">
      <CardContent className="p-0 h-full">
        <img
          src={photo.url}
          alt="Uploaded food"
          className="w-full h-full object-cover"
        />
        
        {/* Progress overlay */}
        {showProgress && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <div className="text-xs">{progress}%</div>
            </div>
          </div>
        )}
        
        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center p-2">
            <div className="text-center text-white text-xs">
              <X className="w-4 h-4 mx-auto mb-1" />
              <div>Upload failed</div>
            </div>
          </div>
        )}
        
        <button
          onClick={onDelete}
          className="absolute top-2 right-2 w-6 h-6 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
        {/* Date Selector */}
        <div className="text-center">
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="secondary" className="gap-2 min-w-[250px]">
                <Calendar className="w-4 h-4" />
                {formatDate(selectedDate)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                disabled={(date) =>
                  date > new Date() || date < new Date("1900-01-01")
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Photo upload grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Meals & Drinks</h3>
            <Badge 
              variant={allPhotosUploaded ? "success" : "destructive"}
            >
              {readyPhotos}/3 photos • {allPhotosUploaded ? 'Ready for analysis! ✓' : `${3 - readyPhotos} more needed`}
            </Badge>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            {/* Show first 3 photos or empty slots */}
            {[0, 1, 2].map((index) => {
              const photo = photos[index];
              const slotNumber = index + 1;
              
              if (photo) {
                return (
                  <PhotoCard 
                    key={photo.id} 
                    photo={photo} 
                    onDelete={() => handleDeletePhoto(photo.id)} 
                  />
                );
              }
              
              // Empty slot - clickable placeholder
              return (
                <Card 
                  key={`slot-${index}`} 
                  className="aspect-square border-2 border-dashed border-neutral-300 bg-neutral-50 hover:bg-neutral-100 transition-all duration-200 cursor-pointer hover:scale-105"
                  onClick={handleAddPhoto}
                >
                  <CardContent className="p-3 h-full flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <Camera className="w-6 h-6 text-neutral-400 mx-auto" />
                      <div className="text-xs text-neutral-600 font-medium">
                        Photo {slotNumber}
                      </div>
                      <div className="text-xs text-neutral-500">
                        Tap to add
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          {/* Additional photos beyond the first 3 */}
          {photos.length > 3 && (
            <div className="space-y-3">
              <h4 className="text-sm text-muted">Additional Photos</h4>
              <div className="grid grid-cols-3 gap-3">
                {photos.slice(3).map((photo) => (
                  <PhotoCard 
                    key={photo.id} 
                    photo={photo} 
                    onDelete={() => handleDeletePhoto(photo.id)} 
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Add More button - shown after minimum photos uploaded */}
          {hasMinimum && (
            <Button
              onClick={handleAddPhoto}
              variant="secondary"
              className="w-full h-11 gap-2 border-dashed"
              disabled={isUploading}
            >
              <Camera className="w-4 h-4" />
              {isUploading ? "Uploading..." : "Add More Photos"}
            </Button>
          )}
        </div>

        {/* Notes section */}
        <Card className={isNotesFocused ? 'ring-2 ring-neutral-300 border-neutral-400' : ''}>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted" />
                  <label htmlFor="notes" className="text-sm">Additional Notes (Optional)</label>
                </div>
                {isNotesFocused && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setIsNotesFocused(false);
                      document.getElementById('notes')?.blur();
                    }}
                    className="h-8 px-3 text-xs"
                  >
                    Done
                  </Button>
                )}
              </div>
              <Textarea
                id="notes"
                placeholder="Add any details about your meals, how you're feeling, or other notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onFocus={() => setIsNotesFocused(true)}
                onBlur={() => setIsNotesFocused(false)}
                className={`min-h-[80px] resize-none transition-all duration-200 ${
                  isNotesFocused ? 'min-h-[120px]' : ''
                }`}
              />
            </div>
          </CardContent>
        </Card>

        {/* Finish Day button - only show when minimum photos uploaded */}
        {hasMinimum && (
          <Button
            onClick={handleFinishDay}
            disabled={isProcessing || isUploading}
            className="w-full h-11 gap-2 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Finish Day & Analyze
              </>
            )}
          </Button>
        )}

        {/* Tips card */}
        <Card className="bg-neutral-50">
          <CardContent className="pt-4">
            <div className="space-y-2">
              <h4 className="flex items-center gap-2">
                <span>💡</span>
                <span>Tips for better analysis</span>
              </h4>
              <ul className="text-sm text-muted space-y-1 ml-6">
                <li>• Upload at least 3 photos for good insights</li>
                <li>• Include meals, snacks, and drinks</li>
                <li>• Take clear photos with good lighting</li>
                <li>• Capture the full plate or container</li>
              </ul>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
