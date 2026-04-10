interface StartAppTextProps {
    error?: string;
}

const StartAppText = ({ error }: StartAppTextProps) => {
    return (
        <div className="p-4 lg:p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              <h3 className="text-blue-800 font-medium">
                Inicializando aplicación
              </h3>
            </div>
            <p className="text-blue-600 text-sm mt-1">{error}</p>
          </div>
        </div>
    )
}

export default StartAppText;