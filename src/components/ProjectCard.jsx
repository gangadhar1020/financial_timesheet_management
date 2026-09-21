import React from 'react';

/**
 * ProjectCard Component
 * 
 * Description: A reusable card component to display individual project information.
 * Uses Tailwind CSS for dynamic hover effects, glassmorphism, and responsive design.
 * 
 * @param {Object} project - The project data object.
 */
const ProjectCard = ({ project }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'In Progress':
        return 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20';
      case 'Not Started':
        return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      default:
        return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    }
  };

  return (
    <div className="group relative bg-slate-900/40 backdrop-blur-sm border border-white/5 rounded-2xl p-6 transition-all duration-300 hover:bg-slate-800/60 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1">
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="relative">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-white group-hover:text-indigo-300 transition-colors">
            {project.name}
          </h3>
          <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(project.status)}`}>
            {project.status}
          </span>
        </div>
        
        <p className="text-sm text-slate-400 mb-6 line-clamp-2">
          {project.description}
        </p>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-400">Progress</span>
              <span className="font-medium text-slate-300">{project.progress}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-1.5 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/5">
            <div className="flex -space-x-2">
              {project.team.slice(0, 3).map((member, idx) => (
                <div 
                  key={idx}
                  className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-900 flex items-center justify-center text-xs font-medium text-white shadow-sm"
                  title={member}
                >
                  {member.charAt(0)}
                </div>
              ))}
              {project.team.length > 3 && (
                <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-xs font-medium text-slate-400 shadow-sm">
                  +{project.team.length - 3}
                </div>
              )}
            </div>
            
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {new Date(project.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;
