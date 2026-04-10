import { useDropzone } from 'react-dropzone';
import { FileSpreadsheet } from 'lucide-react';

interface FileDropzoneProps {
  onFileAccepted: (file: File) => void;
  disabled?: boolean;
}

export const FileDropzone = ({ onFileAccepted, disabled = false }: FileDropzoneProps) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        onFileAccepted(file);
      }
    },
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    multiple: false,
    disabled,
  });

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
        transition-colors duration-200
        ${
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input {...getInputProps()} />
      <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-gray-400" />
      {isDragActive ? (
        <p className="text-blue-600 font-medium">Suelta el archivo aquí...</p>
      ) : (
        <>
          <p className="text-gray-700 font-medium mb-1">
            Arrastra y suelta un archivo Excel aquí
          </p>
          <p className="text-gray-500 text-sm">
            o haz clic para seleccionar un archivo (.xls, .xlsx)
          </p>
        </>
      )}
    </div>
  );
};
