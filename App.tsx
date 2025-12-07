import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AppStep, GradingResult, HistoryItem, Annotation } from './types';
import Camera from './components/Camera';
import { gradeSubmission } from './services/geminiService';
import { compressImage, base64ToFile, drawAnnotationsOnImage } from './utils/imageUtils';

// Icons
const CameraIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
  </svg>
);

const PhotoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
  </svg>
);

const PaperClipIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-green-600">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const XMarkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-red-600">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const HistoryIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const ShareIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
  </svg>
);

const ClipboardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
  </svg>
);

const ShareSystemIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15m0-3-3-3m0 0-3 3m3-3V15" />
  </svg>
);

const PencilIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
    </svg>
);

const TextToolIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
  </svg>
);

const UserGroupIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5-7.5" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
  </svg>
);

export default function App() {
  const [step, setStep] = useState<AppStep>(AppStep.SETUP);
  
  // Data States
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isReviewing, setIsReviewing] = useState<boolean>(false); // True if viewing an old item

  // Input states
  const [answerKeyText, setAnswerKeyText] = useState<string>('');
  const [answerKeyFile, setAnswerKeyFile] = useState<{name: string, data: string, mimeType: string} | null>(null);
  
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [result, setResult] = useState<GradingResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Editable States (For Manual Correction)
  const [editableScore, setEditableScore] = useState<number | string>('');
  const [editableSummary, setEditableSummary] = useState<string>('');
  const [editableClassName, setEditableClassName] = useState<string>('');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [activeTool, setActiveTool] = useState<'correct' | 'incorrect' | 'text'>('correct');
  
  // Text Input State on Image
  const [activeInput, setActiveInput] = useState<{id: string, x: number, y: number, value: string, pageIndex: number} | null>(null);

  // Share Modal State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // History Group State
  const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>({});
  
  // Refs
  const studentWorkInputRef = useRef<HTMLInputElement>(null);
  const answerKeyInputRef = useRef<HTMLInputElement>(null);
  const imageContainerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const textInputRef = useRef<HTMLInputElement>(null);

  // 1. Load data from local storage on mount
  useEffect(() => {
    // Load History
    const savedHistory = localStorage.getItem('grading_history');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        // Migration check
        const migrated = parsed.map((item: any) => {
             if (item.image && !item.images) {
                 return { ...item, images: [item.image] };
             }
             return item;
        });
        setHistory(migrated);
        
        const groups = Array.from(new Set(migrated.map((i: HistoryItem) => i.className || 'Khác')));
        const initialExpanded = groups.reduce((acc: any, cls: any) => ({...acc, [cls]: true}), {});
        setExpandedClasses(initialExpanded);
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }

    // Load Saved Answer Key Text
    const savedAnswerKeyText = localStorage.getItem('saved_answerKeyText');
    if (savedAnswerKeyText) {
        setAnswerKeyText(savedAnswerKeyText);
    }

    // Load Saved Answer Key File
    const savedAnswerKeyFile = localStorage.getItem('saved_answerKeyFile');
    if (savedAnswerKeyFile) {
        try {
            setAnswerKeyFile(JSON.parse(savedAnswerKeyFile));
        } catch (e) {
            console.error("Failed to load saved answer key file", e);
        }
    }
  }, []);

  // 2. Persist inputs whenever they change
  useEffect(() => {
      localStorage.setItem('saved_answerKeyText', answerKeyText);
  }, [answerKeyText]);


  // Group history by class name
  const groupedHistory = useMemo(() => {
    const groups: Record<string, HistoryItem[]> = {};
    history.forEach(item => {
      const className = item.className && item.className.trim() !== '' ? item.className : 'Chưa phân lớp';
      if (!groups[className]) groups[className] = [];
      groups[className].push(item);
    });
    return groups;
  }, [history]);

  const toggleClassGroup = (className: string) => {
    setExpandedClasses(prev => ({
      ...prev,
      [className]: !prev[className]
    }));
  };

  // Focus input when activeInput appears
  useEffect(() => {
    if (activeInput && textInputRef.current) {
        textInputRef.current.focus();
    }
  }, [activeInput]);

  // --- Handlers for Answer Key File ---
  const handleAnswerKeyUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Create a compressed version to save to localStorage if it's an image
      // If it's a PDF, we try to save as is, but warn if too big later
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        
        let fileDataToSave = {
            name: file.name,
            data: base64String,
            mimeType: file.type
        };

        // Try to compress if it's an image to save storage space
        if (file.type.startsWith('image/')) {
            try {
                const compressed = await compressImage(base64String, 1024, 0.7);
                fileDataToSave.data = compressed;
            } catch (e) {
                console.warn("Failed to compress answer key image", e);
            }
        }

        setAnswerKeyFile(fileDataToSave);
        
        try {
            localStorage.setItem('saved_answerKeyFile', JSON.stringify(fileDataToSave));
        } catch (e) {
            console.error("Storage quota exceeded", e);
            alert("File quá lớn để lưu tự động. Vui lòng tải file nhỏ hơn nếu muốn giữ lại sau khi tải lại trang.");
        }
      };
      reader.readAsDataURL(file);
      event.target.value = ''; // Reset
    }
  };

  const removeAnswerKeyFile = () => {
    setAnswerKeyFile(null);
    localStorage.removeItem('saved_answerKeyFile');
  };

  // --- Handlers for Student Work (Capture/Upload) ---
  const handleCapture = (imageData: string) => {
    setCapturedImages(prev => [...prev, imageData]);
    // Don't change step here, allow multiple captures
  };

  const handleStudentWorkUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file: File) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64String = reader.result as string;
            setCapturedImages(prev => [...prev, base64String]);
          };
          reader.readAsDataURL(file);
      });
      event.target.value = '';
    }
  };

  const removeCapturedImage = (index: number) => {
    setCapturedImages(prev => prev.filter((_, i) => i !== index));
  };

  const startAnalysis = () => {
      if (capturedImages.length === 0) return;
      setStep(AppStep.ANALYZING);
      analyzeImages();
  }

  // --- Analysis ---
  const analyzeImages = async () => {
    setErrorMsg(null);
    setIsReviewing(false); 
    setAnnotations([]); 
    setActiveInput(null);
    
    try {
      // 1. Compress Student Images
      const compressedImagesPromise = capturedImages.map(img => compressImage(img, 1024, 0.7));
      const compressedStudentImages = await Promise.all(compressedImagesPromise);

      // 2. Compress Answer Key Image (Already potentially compressed/loaded)
      let finalAnswerKeyFile = undefined;
      if (answerKeyFile) {
         // If stored data is already good, use it. But logic here ensures we send good data.
         // If it's a PDF stored as base64, we pass it.
         // If it's an image, we ensure it is compressed (though handleAnswerKeyUpload did it).
         finalAnswerKeyFile = {
             mimeType: answerKeyFile.mimeType,
             data: answerKeyFile.data
         };
      }

      // 3. Send to AI (Auto detect subject/grade)
      const data = await gradeSubmission(
          compressedStudentImages, 
          answerKeyText, 
          finalAnswerKeyFile
      );
      
      setResult(data);

      // 4. Auto-generate Annotations based on AI data
      const autoAnnotations: Annotation[] = [];

      // Add Score Annotation (Top Left of First Page)
      autoAnnotations.push({
        id: 'auto-score',
        x: 5, // 5% from left
        y: 2, // 2% from top
        type: 'text',
        text: `${data.score}`,
        pageIndex: 0
      });

      // Add Details Annotations
      data.details.forEach((detail, idx) => {
        if (typeof detail.x === 'number' && typeof detail.y === 'number') {
            autoAnnotations.push({
                id: `auto-detail-${idx}`,
                x: detail.x,
                y: detail.y,
                type: detail.isCorrect ? 'correct' : 'incorrect',
                pageIndex: typeof detail.pageIndex === 'number' ? detail.pageIndex : 0
            });
        }
      });

      setAnnotations(autoAnnotations);

      // Initialize editable fields with AI results
      setEditableScore(data.score);
      setEditableSummary(data.summary);
      setEditableClassName(data.className || '');
      setStep(AppStep.RESULTS);
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Lỗi không xác định");
      setStep(AppStep.SETUP);
    }
  };

  // --- Annotation Logic (Simplified: Click to Add/Remove only) ---

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>, pageIndex: number) => {
    if (isReviewing) return;
    
    const container = imageContainerRefs.current[pageIndex];
    if (!container) return;
    
    // If input is active, commit it (clicking outside logic)
    if (activeInput) {
        commitTextInput();
        return;
    }

    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (activeTool === 'text') {
        setActiveInput({
            id: Date.now().toString(),
            x,
            y,
            value: '',
            pageIndex
        });
    } else {
        const newAnnotation: Annotation = {
            id: Date.now().toString(),
            x,
            y,
            type: activeTool,
            pageIndex
        };
        setAnnotations([...annotations, newAnnotation]);
    }
  };

  const handleImageDoubleClick = (e: React.MouseEvent<HTMLDivElement>, pageIndex: number) => {
    if (isReviewing) return;
    const container = imageContainerRefs.current[pageIndex];
    if (!container) return;
    e.preventDefault();
    e.stopPropagation();

    if (activeInput) {
        commitTextInput();
    }

    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newAnnotation: Annotation = {
        id: Date.now().toString(),
        x,
        y,
        type: 'incorrect',
        pageIndex
    };
    setAnnotations([...annotations, newAnnotation]);
  };

  const removeAnnotation = (e: React.MouseEvent, id: string) => {
      e.stopPropagation(); 
      if (isReviewing) return;
      setAnnotations(annotations.filter(a => a.id !== id));
  };

  const commitTextInput = () => {
      if (activeInput && activeInput.value.trim() !== '') {
          const newAnnotation: Annotation = {
              id: activeInput.id,
              x: activeInput.x,
              y: activeInput.y,
              type: 'text',
              text: activeInput.value,
              pageIndex: activeInput.pageIndex
          };
          setAnnotations([...annotations, newAnnotation]);
      }
      setActiveInput(null);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          commitTextInput();
      }
  };

  // --- History & Persistence ---
  const saveAndExit = async () => {
    if (result && capturedImages.length > 0) {
      // Commit any pending text input
      let finalAnnotations = [...annotations];
      if (activeInput && activeInput.value.trim() !== '') {
         finalAnnotations.push({
            id: activeInput.id,
            x: activeInput.x,
            y: activeInput.y,
            type: 'text',
            text: activeInput.value,
            pageIndex: activeInput.pageIndex
         });
      }

      // Draw annotations on ALL images
      const annotatedImagesPromise = capturedImages.map((img, idx) => {
          const pageAnnotations = finalAnnotations.filter(a => a.pageIndex === idx);
          return drawAnnotationsOnImage(img, pageAnnotations);
      });

      const annotatedImages = await Promise.all(annotatedImagesPromise);
      await finishSaving(annotatedImages);
    } else {
        resetApp();
    }
  };

  const finishSaving = async (annotatedImages: string[]) => {
      if (!result) return;
      const finalScore = typeof editableScore === 'number' ? editableScore : parseInt(editableScore as string) || 0;
      const finalSummary = editableSummary;
      const finalClassName = editableClassName.trim() || 'Chưa phân lớp';

      const finalResult: GradingResult = {
          ...result,
          score: finalScore,
          summary: finalSummary,
          className: finalClassName
      };

      const newItem: HistoryItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        score: finalScore,
        letterGrade: result.letterGrade,
        className: finalClassName,
        images: annotatedImages,
        result: finalResult
      };
      
      const newHistory = [newItem, ...history];
      setHistory(newHistory);
      localStorage.setItem('grading_history', JSON.stringify(newHistory));
      
      // Auto expand the class group we just saved to
      setExpandedClasses(prev => ({...prev, [finalClassName]: true}));
      
      resetApp();
  }

  const viewHistoryItem = (item: HistoryItem) => {
    // Handle migration for old items that might not have 'images'
    const imgs = item.images || (item.image ? [item.image] : []);
    
    setCapturedImages(imgs);
    setResult(item.result);
    setEditableScore(item.result.score);
    setEditableSummary(item.result.summary);
    setEditableClassName(item.className);
    setAnnotations([]); 
    setActiveInput(null);
    setIsReviewing(true);
    setStep(AppStep.RESULTS);
  };

  const deleteHistoryItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newHistory = history.filter(item => item.id !== id);
    setHistory(newHistory);
    localStorage.setItem('grading_history', JSON.stringify(newHistory));
  };

  const clearHistory = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử chấm bài không? Hành động này không thể hoàn tác.")) {
      setHistory([]);
      localStorage.removeItem('grading_history');
    }
  };

  const resetApp = () => {
    setCapturedImages([]);
    setResult(null);
    setStep(AppStep.SETUP);
    setErrorMsg(null);
    setIsReviewing(false);
    setIsShareModalOpen(false);
    setAnnotations([]);
    setActiveInput(null);
    setEditableScore('');
    setEditableSummary('');
    setEditableClassName('');
  };

  // --- Sharing Logic ---
  const getShareText = () => {
    if (!result) return "";
    return `KẾT QUẢ CHẤM BÀI${editableClassName ? ` - ${editableClassName}` : ''}\nĐiểm: ${editableScore}/100\nNhận xét: ${editableSummary}\n\nChấm bởi AI Grader VN`;
  };

  const handleShareImage = async () => {
    if (!result || capturedImages.length === 0) return;
    
    // Commit any active input before sharing
    if (activeInput) commitTextInput();

    try {
      const shareData: ShareData = {
        title: 'Kết quả chấm điểm',
        text: getShareText(),
      };

      // Create annotations snapshot
      const currentAnnotations = activeInput && activeInput.value.trim() ? 
        [...annotations, {id: activeInput.id, x: activeInput.x, y: activeInput.y, type: 'text', text: activeInput.value, pageIndex: activeInput.pageIndex} as Annotation] : 
        annotations;

      // Only share the first image or stitch them? 
      // Navigator share usually supports array of files. Let's try sending all.
      // But limit to first 3 to avoid failure? Let's try all.
      
      const filePromises = capturedImages.map(async (img, idx) => {
          const pageAnnotations = currentAnnotations.filter(a => a.pageIndex === idx);
          const annotated = await drawAnnotationsOnImage(img, pageAnnotations);
          return base64ToFile(annotated, `grading_page_${idx+1}.jpg`);
      });

      const files = await Promise.all(filePromises);
      
      if (navigator.canShare && navigator.canShare({ files })) {
        shareData.files = files;
      } else if (files.length > 0 && navigator.canShare && navigator.canShare({files: [files[0]]})) {
          // Fallback to first image if too many
           shareData.files = [files[0]];
      }

      await navigator.share(shareData);
      setIsShareModalOpen(false);
    } catch (error) {
      console.log("Share skipped or failed", error);
    }
  };

  const handleShareTextOnly = async () => {
      if (!result) return;
      try {
        await navigator.share({
          title: 'Kết quả chấm điểm',
          text: getShareText(),
        });
        setIsShareModalOpen(false);
      } catch (error) {
        console.log("Share text skipped or failed", error);
      }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(getShareText());
      alert("Đã sao chép kết quả vào bộ nhớ tạm!");
      setIsShareModalOpen(false);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  // Check if we have enough info to proceed
  const isReady = answerKeyText.trim().length > 0 || answerKeyFile !== null;

  // ----------------------------------------------------------------------
  // RENDER: SETUP STEP
  // ----------------------------------------------------------------------
  if (step === AppStep.SETUP) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <div className="flex-1 max-w-md mx-auto w-full p-6 flex flex-col">
          <header className="mb-6 mt-4">
            <h1 className="text-3xl font-bold text-indigo-900 mb-2">Chấm điểm AI</h1>
            <p className="text-gray-500 text-sm">
              Cung cấp đáp án mẫu và bài làm của học sinh để chấm tự động.
            </p>
          </header>

          <div className="flex-1 flex flex-col gap-5">
            {errorMsg && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100">
                {errorMsg}
              </div>
            )}

            {/* ANSWER KEY SECTION */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-800 flex justify-between items-center">
                <span>Đáp án mẫu / Tiêu chí</span>
                <span className="text-xs font-normal text-gray-500">Bắt buộc</span>
              </label>

              <textarea
                value={answerKeyText}
                onChange={(e) => setAnswerKeyText(e.target.value)}
                placeholder="Nhập đáp án hoặc ghi chú cho AI (VD: 'Chấp nhận cách giải khác miễn là đúng logic'...)"
                className="w-full h-24 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none text-gray-800 placeholder-gray-400 text-sm"
              />

              <div className="flex flex-col gap-2">
                 {!answerKeyFile ? (
                    <button
                        onClick={() => answerKeyInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-gray-600 hover:bg-gray-100 hover:border-indigo-400 transition-colors text-sm"
                    >
                        <PaperClipIcon />
                        <span>Tải file đáp án (Ảnh, PDF, Word)</span>
                    </button>
                 ) : (
                    <div className="flex items-center justify-between px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-xl text-sm">
                        <div className="flex items-center gap-2 text-indigo-900 overflow-hidden">
                             <PaperClipIcon />
                             <span className="truncate font-medium">{answerKeyFile.name}</span>
                        </div>
                        <button onClick={removeAnswerKeyFile} className="p-1 text-indigo-400 hover:text-red-500 transition-colors">
                            <TrashIcon />
                        </button>
                    </div>
                 )}
                 <input 
                    type="file" 
                    ref={answerKeyInputRef} 
                    onChange={handleAnswerKeyUpload} 
                    accept="image/*,application/pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden" 
                 />
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-800">
                Bài làm học sinh
              </label>
              
              {/* Image Preview List */}
              {capturedImages.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto py-2 no-scrollbar">
                      {capturedImages.map((img, idx) => (
                          <div key={idx} className="relative w-20 h-24 flex-shrink-0 rounded-lg overflow-hidden border border-gray-200">
                              <img src={img} className="w-full h-full object-cover" alt={`Page ${idx + 1}`} />
                              <button 
                                onClick={() => removeCapturedImage(idx)}
                                className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 hover:bg-red-500"
                              >
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                                  </svg>
                              </button>
                              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] text-center">
                                  Trang {idx + 1}
                              </div>
                          </div>
                      ))}
                  </div>
              )}

              {capturedImages.length > 0 ? (
                  <div className="flex gap-3">
                      <button
                            onClick={() => setStep(AppStep.CAMERA)}
                            className="flex-1 py-3 bg-white border border-indigo-200 text-indigo-600 rounded-xl font-semibold flex items-center justify-center gap-2"
                        >
                            <CameraIcon />
                            Chụp thêm
                        </button>
                      <button
                            onClick={startAnalysis}
                            className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl font-semibold shadow-md hover:bg-indigo-700 active:scale-[0.98]"
                        >
                            Chấm {capturedImages.length} trang
                        </button>
                  </div>
              ) : (
                <div className="flex gap-3">
                    <input 
                    type="file" 
                    ref={studentWorkInputRef} 
                    onChange={handleStudentWorkUpload} 
                    accept="image/*" 
                    multiple
                    className="hidden" 
                    />

                    <button
                        disabled={!isReady}
                        onClick={() => setStep(AppStep.CAMERA)}
                        className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-semibold shadow-md transition-all ${
                        isReady
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98]'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                    >
                        <CameraIcon />
                        Chụp
                    </button>
                    
                    <button
                        disabled={!isReady}
                        onClick={() => studentWorkInputRef.current?.click()}
                        className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-semibold shadow-md transition-all ${
                        isReady
                            ? 'bg-white text-indigo-600 border-2 border-indigo-100 hover:border-indigo-200 active:scale-[0.98]'
                            : 'bg-gray-50 text-gray-300 border-2 border-gray-100 cursor-not-allowed'
                        }`}
                    >
                        <PhotoIcon />
                        Tải ảnh
                    </button>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 my-2"></div>

            {/* HISTORY SECTION WITH GROUPING */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <HistoryIcon />
                    Lịch sử chấm
                </h3>
                {history.length > 0 && (
                  <button 
                    onClick={clearHistory}
                    className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                  >
                    Xóa tất cả
                  </button>
                )}
              </div>
              
              {history.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <p className="text-gray-400 text-sm">Chưa có bài chấm nào</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4 pb-8">
                  {Object.entries(groupedHistory).map(([className, items]: [string, HistoryItem[]]) => {
                     const avgScore = Math.round(items.reduce((acc, i) => acc + i.score, 0) / items.length);
                     const isExpanded = expandedClasses[className];
                     
                     return (
                        <div key={className} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                           {/* Class Header */}
                           <div 
                              onClick={() => toggleClassGroup(className)}
                              className="bg-gray-50 p-3 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
                           >
                              <div className="flex items-center gap-2">
                                 {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                                 <div className="flex items-center gap-2">
                                     <UserGroupIcon />
                                     <span className="font-bold text-gray-700 text-sm">{className}</span>
                                     <span className="text-xs px-2 py-0.5 bg-gray-200 rounded-full text-gray-600">{items.length} bài</span>
                                 </div>
                              </div>
                              <div className="text-xs font-semibold text-indigo-600">
                                 TB: {avgScore}đ
                              </div>
                           </div>
                           
                           {/* Class Items */}
                           {isExpanded && (
                               <div className="divide-y divide-gray-100">
                                  {items.map((item) => {
                                    // Handle legacy items that might only have 'image'
                                    const thumb = item.images && item.images.length > 0 ? item.images[0] : item.image;
                                    return (
                                        <div 
                                        key={item.id}
                                        onClick={() => viewHistoryItem(item)}
                                        className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                                        >
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 relative">
                                            <img src={thumb} alt="Thumbnail" className="w-full h-full object-cover" />
                                            {item.images && item.images.length > 1 && (
                                                <div className="absolute bottom-0 right-0 bg-black/60 text-white text-[8px] px-1 rounded-tl">
                                                    +{item.images.length - 1}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                            <span className={`font-bold text-sm ${item.score >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                                                {item.score} đ
                                            </span>
                                            <span className="text-[10px] text-gray-400">
                                                {new Date(item.timestamp).toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit'})}
                                            </span>
                                            </div>
                                            <p className="text-xs text-gray-500 truncate">{item.result.summary}</p>
                                        </div>
                                        <button 
                                            onClick={(e) => deleteHistoryItem(e, item.id)}
                                            className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                                        >
                                            <TrashIcon />
                                        </button>
                                        </div>
                                    )
                                  })}
                               </div>
                           )}
                        </div>
                     );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------------
  // RENDER: CAMERA STEP
  // ----------------------------------------------------------------------
  if (step === AppStep.CAMERA) {
    return (
      <Camera 
        onCapture={handleCapture} 
        onCancel={() => setStep(AppStep.SETUP)} 
        captureCount={capturedImages.length}
      />
    );
  }

  // ----------------------------------------------------------------------
  // RENDER: ANALYZING STEP
  // ----------------------------------------------------------------------
  if (step === AppStep.ANALYZING) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
        <div className="relative w-24 h-24 mb-8">
          <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Đang xử lý & chấm điểm...</h2>
        <p className="text-gray-500 text-center max-w-xs text-sm">
          Đang nén {capturedImages.length} ảnh và gửi tới AI để phân tích. Vui lòng đợi trong giây lát.
        </p>
        <div className="flex gap-2 mt-8 overflow-hidden justify-center max-w-full">
            {capturedImages.slice(0, 3).map((img, i) => (
                <div key={i} className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 opacity-50">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                </div>
            ))}
            {capturedImages.length > 3 && (
                <div className="w-16 h-16 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-400 text-xs">
                    +{capturedImages.length - 3}
                </div>
            )}
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------------
  // RENDER: RESULTS STEP
  // ----------------------------------------------------------------------
  if (step === AppStep.RESULTS && result) {
    const scoreNum = typeof editableScore === 'number' ? editableScore : parseFloat(editableScore as string) || 0;
    const scoreColor = scoreNum >= 80 ? 'text-green-600' : scoreNum >= 50 ? 'text-yellow-600' : 'text-red-600';
    const borderColor = scoreNum >= 80 ? 'border-green-600' : scoreNum >= 50 ? 'border-yellow-600' : 'border-red-600';

    return (
      <div className="min-h-screen bg-gray-50 pb-32 relative">
        {/* Sticky Header */}
        <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-200 p-4 z-10 flex justify-between items-center shadow-sm">
          <h2 className="font-bold text-gray-800">
            {isReviewing ? 'Xem lại kết quả' : 'Chỉnh sửa & Chấm điểm'}
          </h2>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsShareModalOpen(true)}
              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
            >
              <ShareIcon />
            </button>
            {isReviewing && (
               <button onClick={resetApp} className="text-sm font-medium text-gray-500 hover:text-gray-900">
                  Đóng
               </button>
            )}
          </div>
        </div>

        <div className="p-4 max-w-2xl mx-auto space-y-6">
          
          {/* Class Name Input */}
          <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
             <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                 <UserGroupIcon />
             </div>
             <div className="flex-1">
                 <label className="text-xs text-gray-500 block mb-1">Tên Lớp (Lưu vào danh sách)</label>
                 <input 
                    type="text"
                    value={editableClassName}
                    onChange={(e) => setEditableClassName(e.target.value)}
                    placeholder="VD: 5A, 9B..."
                    className="w-full font-bold text-gray-800 outline-none placeholder-gray-300"
                    disabled={isReviewing}
                 />
             </div>
             <div className="flex flex-col gap-1 items-end">
                 {result.detectedSubject && (
                     <div className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                        {result.detectedSubject}
                     </div>
                 )}
                 {result.detectedGradeLevel && (
                     <div className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">
                        {result.detectedGradeLevel}
                     </div>
                 )}
             </div>
          </div>

          {/* Editable Score Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center relative">
            {!isReviewing && (
                <div className="absolute top-4 right-4 text-gray-400">
                    <PencilIcon />
                </div>
            )}
            <div className={`w-32 h-32 rounded-full border-4 ${borderColor} flex items-center justify-center mb-4 overflow-hidden bg-white`}>
                <div className="text-center w-full">
                    {isReviewing ? (
                         <span className={`block text-4xl font-bold ${scoreColor}`}>{editableScore}</span>
                    ) : (
                        <input 
                            type="number"
                            value={editableScore}
                            onChange={(e) => setEditableScore(e.target.value)}
                            className={`block w-full text-center text-4xl font-bold ${scoreColor} focus:outline-none focus:bg-gray-50`}
                            min="0"
                            max="100"
                        />
                    )}
                    <span className={`text-sm font-bold ${scoreColor}`}>/ 100</span>
                </div>
            </div>
            {isReviewing ? (
                 <p className="text-gray-600 text-center text-sm leading-relaxed w-full whitespace-pre-line">{editableSummary}</p>
            ) : (
                <textarea 
                    value={editableSummary}
                    onChange={(e) => setEditableSummary(e.target.value)}
                    className="w-full text-gray-600 text-center text-sm leading-relaxed p-2 border border-dashed border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none resize-none bg-gray-50"
                    rows={3}
                />
            )}
          </div>

          {/* Tool Bar */}
          {!isReviewing && (
            <div className="sticky top-20 z-10 flex justify-center bg-transparent pointer-events-none">
                <div className="bg-white shadow-lg border border-gray-100 rounded-full p-1 flex gap-1 pointer-events-auto">
                     <button 
                        onClick={() => setActiveTool('correct')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTool === 'correct' ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <span>✓</span>
                    </button>
                    <button 
                        onClick={() => setActiveTool('incorrect')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTool === 'incorrect' ? 'bg-red-100 text-red-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <span>✗</span>
                    </button>
                    <button 
                        onClick={() => setActiveTool('text')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTool === 'text' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <TextToolIcon />
                    </button>
                </div>
            </div>
          )}

          {/* Interactive Image Grading Section - Loop through pages */}
          <div className="space-y-4">
            {capturedImages.map((img, pageIndex) => (
                <div key={pageIndex} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-3 border-b border-gray-100 bg-gray-50">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Trang {pageIndex + 1}</span>
                    </div>
                    <div className="relative bg-gray-100 overflow-hidden">
                        <div 
                            ref={el => imageContainerRefs.current[pageIndex] = el}
                            className="relative w-full cursor-crosshair select-none"
                            onClick={(e) => handleImageClick(e, pageIndex)}
                            onDoubleClick={(e) => handleImageDoubleClick(e, pageIndex)}
                        >
                            <img src={img} alt={`Student Work Page ${pageIndex+1}`} className="w-full h-auto block" />
                            
                            {/* Render Annotations for this page */}
                            {annotations.filter(ann => ann.pageIndex === pageIndex).map((ann) => (
                                <div
                                    key={ann.id}
                                    onClick={(e) => removeAnnotation(e, ann.id)}
                                    className="absolute transform -translate-x-1/2 -translate-y-1/2 font-bold drop-shadow-md cursor-pointer hover:scale-125 transition-transform whitespace-nowrap"
                                    style={{ 
                                        left: `${ann.x}%`, 
                                        top: `${ann.y}%`, 
                                        color: ann.type === 'correct' ? '#16a34a' : '#dc2626',
                                        fontSize: ann.type === 'text' ? '1.5rem' : '2rem',
                                        transform: ann.id === 'auto-score' ? 'none' : 'translate(-50%, -50%)' // Score anchors top-left, others center
                                    }}
                                >
                                    {ann.type === 'correct' ? '✓' : ann.type === 'incorrect' ? '✗' : ann.text}
                                </div>
                            ))}

                            {/* Active Input Box */}
                            {activeInput && activeInput.pageIndex === pageIndex && (
                                <div 
                                    className="absolute transform -translate-x-1/2 -translate-y-1/2"
                                    style={{ left: `${activeInput.x}%`, top: `${activeInput.y}%` }}
                                    onClick={(e) => e.stopPropagation()} 
                                >
                                    <input
                                        ref={textInputRef}
                                        type="text"
                                        value={activeInput.value}
                                        onChange={(e) => setActiveInput({...activeInput, value: e.target.value})}
                                        onKeyDown={handleInputKeyDown}
                                        onBlur={commitTextInput}
                                        className="w-24 bg-white/80 border-b-2 border-red-500 text-red-600 font-bold text-center outline-none p-0 text-xl"
                                        placeholder="..."
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ))}
          </div>

          {/* AI Details List */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 px-1">Gợi ý từ AI</h3>
            
            {result.details.length === 0 ? (
                 <div className="bg-white p-6 rounded-xl text-center text-gray-500 shadow-sm">
                    Không tìm thấy lỗi sai nào đáng kể.
                 </div>
            ) : (
                result.details.map((item, idx) => (
                <div key={idx} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex gap-4">
                    <div className="flex-shrink-0 pt-1">
                    {item.isCorrect ? <CheckIcon /> : <XMarkIcon />}
                    </div>
                    <div className="flex-1 space-y-2">
                        <div className="flex justify-between items-start">
                             {!item.isCorrect && (
                                <div className="text-sm bg-red-50 text-red-800 p-2 rounded border border-red-100 line-through decoration-red-400 decoration-2">
                                    {item.original}
                                </div>
                            )}
                            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded ml-2 whitespace-nowrap">
                                Trang {(item.pageIndex || 0) + 1}
                            </span>
                        </div>
                        
                        <div className="text-sm font-medium text-gray-900">
                            {item.correction}
                        </div>
                        <p className="text-xs text-gray-500 italic">
                            {item.explanation}
                        </p>
                    </div>
                </div>
                ))
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 max-w-md mx-auto flex gap-3 z-20">
             {isReviewing ? (
                 <button 
                    onClick={resetApp}
                    className="w-full py-3 bg-gray-100 text-gray-800 rounded-xl font-semibold hover:bg-gray-200"
                >
                    Quay lại
                </button>
             ) : (
                 <>
                    <button 
                        onClick={resetApp}
                        className="flex-1 py-3 bg-white border-2 border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50"
                    >
                        Hủy bỏ
                    </button>
                    <button 
                        onClick={saveAndExit}
                        className="flex-1 py-3 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 font-semibold"
                    >
                        Lưu kết quả
                    </button>
                 </>
             )}
        </div>

        {/* Share Modal */}
        {isShareModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsShareModalOpen(false)}></div>
            <div className="relative bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl transform transition-all animate-fade-in-up scale-100">
              
              <div className="bg-white p-5 border-b border-gray-100">
                <h3 className="text-lg font-bold text-center text-gray-800">Chia sẻ kết quả</h3>
              </div>

              <div className="p-5 space-y-4">
                
                {/* Option 1: Image Share */}
                <div className="border border-indigo-100 bg-indigo-50/50 rounded-xl p-4 transition-all hover:bg-indigo-50">
                   <div className="flex gap-3 mb-3">
                       <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                           <PhotoIcon />
                       </div>
                       <div>
                           <h4 className="font-bold text-indigo-900 text-sm">Ảnh bài làm & Điểm số</h4>
                           <p className="text-xs text-indigo-600/80 leading-snug">
                               Gửi ảnh đã được AI chấm điểm, bao gồm các dấu đúng/sai và lời phê trên ảnh.
                           </p>
                       </div>
                   </div>
                   <button 
                     onClick={handleShareImage} 
                     className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
                   >
                     <ShareSystemIcon />
                     Gửi Ảnh
                   </button>
                </div>

                {/* Option 2: Text Share */}
                <div className="border border-gray-100 bg-gray-50/50 rounded-xl p-4 transition-all hover:bg-gray-50">
                   <div className="flex gap-3 mb-3">
                       <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 flex-shrink-0">
                           <ClipboardIcon />
                       </div>
                       <div>
                           <h4 className="font-bold text-gray-800 text-sm">Nội dung nhận xét</h4>
                           <p className="text-xs text-gray-500 leading-snug">
                               Chỉ chia sẻ điểm số và nội dung nhận xét dưới dạng văn bản.
                           </p>
                       </div>
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                       <button 
                         onClick={handleShareTextOnly}
                         className="py-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-sm font-medium rounded-lg shadow-sm transition-all"
                       >
                         Gửi Text
                       </button>
                       <button 
                         onClick={handleCopyText}
                         className="py-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-sm font-medium rounded-lg shadow-sm transition-all"
                       >
                         Sao chép
                       </button>
                   </div>
                </div>

              </div>

              <div className="bg-gray-50 p-3 text-center border-t border-gray-100">
                <button 
                  onClick={() => setIsShareModalOpen(false)}
                  className="text-sm text-gray-500 hover:text-gray-800 font-medium px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}