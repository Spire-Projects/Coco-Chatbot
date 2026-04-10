interface PageHeaderProps {
    title: string;
    subtitle?: string;
    icon?: React.ReactNode;
    classNameIcon?: string;
}

const PageHeader = ({ title, subtitle, icon, classNameIcon }: PageHeaderProps) => {
    return (
       
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-lg self-center mt-1">
            {icon && (
              <span className={"h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 " + (classNameIcon || "text-blue-600") }>
                {icon}
              </span>
            )}
          </div>
          <div>
            <p className="text-2xl sm:text-4xl lg:text-4xl font-bold text-gray-900">
                {title}
            </p>
            {subtitle && (
              <p className="text-gray-500 text-sm sm:text-base">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>
    );
}

export default PageHeader;