import React, { useState, useRef } from 'react';
import { AppStep, GradingResult } from './types';
import Camera from './components/Camera';
import { gradeSubmission } from './services/geminiService';

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

export default function App() {
  const [step, setStep] = useState<AppStep>(AppStep.SETUP);
  // Input states
  const [answerKeyText, setAnswerKeyText] = useState<string>('');
  const [answerKeyFile, setAnswerKeyFile] = useState<{name: string, data: string, mimeType: string} | null>(null);
  
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [result, setResult] = useState<GradingResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Refs
  const studentWorkInputRef = useRef<HTMLInputElement>(null);
  const answerKeyInputRef = useRef<HTMLInputElement>(null);

  // --- Handlers for Answer Key File ---
  const handleAnswerKeyUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setAnswerKeyFile({
            name: file.name,
            data: base64String,
            mimeType: file.type
        });
      };
      reader.readAsDataURL(file);
      event.target.value = ''; // Reset
    }
  };

  const removeAnswerKeyFile = () => {
    setAnswerKeyFile(null);
  };

  // --- Handlers for Student Work (Capture/Upload) ---
  const handleCapture = (imageData: string) => {
    setCapturedImage(imageData);
    setStep(AppStep.ANALYZING);
    analyzeImage(imageData);
  };

  const handleStudentWorkUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setCapturedImage(base64String);
        setStep(AppStep.ANALYZING);
        analyzeImage(base64String);
      };
      reader.readAsDataURL(file);
      event.target.value = '';
    }
  };

  // --- Analysis ---
  const analyzeImage = async (image: string) => {
    setErrorMsg(null);
    try {
      // Pass both text and file (if exists) to the service
      const data = await gradeSubmission(
          image, 
          answerKeyText, 
          answerKeyFile ? { mimeType: answerKeyFile.mimeType, data: answerKeyFile.data } : undefined
      );
      setResult(data);
      setStep(AppStep.RESULTS);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Lỗi không xác định");
      setStep(AppStep.SETUP);
    }
  };

  const resetApp = () => {
    setCapturedImage(null);
    setResult(null);
    setStep(AppStep.SETUP);
    setErrorMsg(null);
  };

  // Check if we have enough info to proceed (either Text OR File for Answer Key)
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
            <p className="text-gray-500">
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

              {/* Text Input */}
              <textarea
                value={answerKeyText}
                onChange={(e) => setAnswerKeyText(e.target.value)}
                placeholder="Nhập nội dung đáp án, hoặc tải file bên dưới..."
                className="w-full h-32 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none text-gray-800 placeholder-gray-400 text-sm"
              />

              {/* File Upload for Answer Key */}
              <div className="flex flex-col gap-2">
                 {!answerKeyFile ? (
                    <button
                        onClick={() => answerKeyInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-gray-600 hover:bg-gray-100 hover:border-indigo-400 transition-colors text-sm"
                    >
                        <PaperClipIcon />
                        <span>Tải file đáp án (Ảnh, PDF)</span>
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
                    accept="image/*,application/pdf"
                    className="hidden" 
                 />
              </div>
            </div>

            <div className="border-t border-gray-100 my-2"></div>

            {/* ACTION BUTTONS */}
            <div className="mt-auto mb-6 flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-800">
                Bài làm học sinh
              </label>
              
              <div className="flex gap-3">
                <input 
                  type="file" 
                  ref={studentWorkInputRef} 
                  onChange={handleStudentWorkUpload} 
                  accept="image/*" 
                  className="hidden" 
                />

                <button
                    disabled={!isReady}
                    onClick={() => setStep(AppStep.CAMERA)}
                    className={`flex-1 py-4 rounded-xl flex items-center justify-center gap-2 font-semibold shadow-lg transition-all ${
                    isReady
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98]'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                >
                    <CameraIcon />
                    Chụp ảnh
                </button>
                
                <button
                    disabled={!isReady}
                    onClick={() => studentWorkInputRef.current?.click()}
                    className={`flex-1 py-4 rounded-xl flex items-center justify-center gap-2 font-semibold shadow-lg transition-all ${
                    isReady
                        ? 'bg-white text-indigo-600 border-2 border-indigo-100 hover:border-indigo-200 active:scale-[0.98]'
                        : 'bg-gray-50 text-gray-300 border-2 border-gray-100 cursor-not-allowed'
                    }`}
                >
                    <PhotoIcon />
                    Tải ảnh
                </button>
              </div>
              {!isReady && (
                <p className="text-xs text-center text-gray-400 mt-2">
                    Vui lòng nhập đáp án hoặc tải file đáp án trước.
                </p>
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
        <h2 className="text-xl font-bold text-gray-800 mb-2">Đang chấm bài...</h2>
        <p className="text-gray-500 text-center max-w-xs">
          AI đang phân tích bài làm và so sánh với đáp án mẫu.
        </p>
        {capturedImage && (
            <div className="mt-8 w-32 h-32 rounded-lg overflow-hidden border border-gray-200 opacity-50">
                <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
            </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------------------------
  // RENDER: RESULTS STEP
  // ----------------------------------------------------------------------
  if (step === AppStep.RESULTS && result) {
    // Determine color based on score
    const scoreColor = result.score >= 80 ? 'text-green-600' : result.score >= 50 ? 'text-yellow-600' : 'text-red-600';
    const borderColor = result.score >= 80 ? 'border-green-600' : result.score >= 50 ? 'border-yellow-600' : 'border-red-600';

    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        {/* Sticky Header */}
        <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-200 p-4 z-10 flex justify-between items-center shadow-sm">
          <h2 className="font-bold text-gray-800">Kết quả</h2>
          <button 
            onClick={resetApp}
            className="text-sm font-medium text-indigo-600"
          >
            Chấm bài mới
          </button>
        </div>

        <div className="p-4 max-w-2xl mx-auto space-y-6">
          
          {/* Score Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center">
            <div className={`w-32 h-32 rounded-full border-4 ${borderColor} flex items-center justify-center mb-4`}>
                <div className="text-center">
                    <span className={`block text-4xl font-bold ${scoreColor}`}>{result.score}</span>
                    <span className={`text-sm font-bold ${scoreColor}`}>/ 100</span>
                </div>
            </div>
            <div className={`text-2xl font-bold ${scoreColor} mb-2`}>{result.letterGrade}</div>
            <p className="text-gray-600 text-center text-sm leading-relaxed">
              {result.summary}
            </p>
          </div>

          {/* Details List */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 px-1">Chi tiết lỗi</h3>
            
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
                        {!item.isCorrect && (
                            <div className="text-sm bg-red-50 text-red-800 p-2 rounded border border-red-100 line-through decoration-red-400 decoration-2">
                                {item.original}
                            </div>
                        )}
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

          {/* User Image Preview */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
             <h3 className="text-sm font-bold text-gray-700 mb-3">Ảnh bài làm</h3>
             <div className="rounded-lg overflow-hidden bg-gray-100">
                <img src={capturedImage!} alt="Student Work" className="w-full h-auto" />
             </div>
          </div>
        </div>

        {/* Floating Action Button for Retake */}
        <div className="fixed bottom-6 left-0 right-0 px-6 max-w-2xl mx-auto">
             <button 
                onClick={resetApp}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 font-semibold"
            >
                Hoàn tất
            </button>
        </div>
      </div>
    );
  }

  return null;
}