import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Search, Package, Layers } from 'lucide-react';
import { TableSkeleton } from '../LoadingStates';
import { Dependency, Framework } from '../../types';
import { useDebounce } from '../../hooks/useDebounce';

interface DependenciesTabProps {
  dependencies: Dependency[];
  frameworks?: Framework[];
  isLoading: boolean;
}

export default function DependenciesTab({ dependencies, frameworks, isLoading }: DependenciesTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'runtime' | 'dev'>('all');
  
  // Debounce search query to avoid excessive filtering
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Filter and search dependencies
  const filteredDependencies = useMemo(() => {
    let filtered = dependencies;

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter(dep => dep.type === typeFilter);
    }

    // Filter by search query
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      filtered = filtered.filter(dep => 
        dep.name.toLowerCase().includes(query) ||
        dep.version.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [dependencies, typeFilter, debouncedSearch]);

  // Count dependencies by type
  const runtimeCount = dependencies.filter(d => d.type === 'runtime').length;
  const devCount = dependencies.filter(d => d.type === 'dev').length;

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <TableSkeleton rows={3} columns={3} />
        <TableSkeleton rows={8} columns={3} />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Framework Detection Section */}
      {frameworks && frameworks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Layers className="h-4 w-4 sm:h-5 sm:w-5" />
              Detected Frameworks
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Major frameworks and libraries identified in the project</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
              {frameworks.map((framework, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base truncate">{framework.name}</p>
                    <p className="text-xs text-gray-500">{framework.category}</p>
                  </div>
                  {framework.version && (
                    <Badge variant="secondary" className="text-xs ml-2 whitespace-nowrap">
                      v{framework.version}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dependencies List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Package className="h-4 w-4 sm:h-5 sm:w-5" />
            Dependencies
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            {dependencies.length} total dependencies ({runtimeCount} runtime, {devCount} dev)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters and Search */}
          <div className="flex flex-col gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search dependencies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={(value: 'all' | 'runtime' | 'dev') => setTypeFilter(value)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="runtime">Runtime</SelectItem>
                <SelectItem value="dev">Development</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dependencies List */}
          {filteredDependencies.length > 0 ? (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredDependencies.map((dep, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between py-2 sm:py-3 px-3 sm:px-4 border rounded-lg hover:bg-gray-50 transition-colors gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base text-gray-900 truncate">{dep.name}</p>
                    <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-1">
                      <p className="text-xs sm:text-sm text-gray-500">v{dep.version}</p>
                      {dep.framework && (
                        <>
                          <span className="text-gray-300 hidden sm:inline">•</span>
                          <p className="text-xs text-gray-400 truncate">{dep.framework}</p>
                        </>
                      )}
                    </div>
                  </div>
                  <Badge 
                    variant={dep.type === 'runtime' ? 'default' : 'secondary'}
                    className="ml-2 shrink-0 text-xs"
                  >
                    {dep.type}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                {searchQuery || typeFilter !== 'all' 
                  ? 'No dependencies match your filters' 
                  : 'No dependencies found'}
              </p>
              {(searchQuery || typeFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setTypeFilter('all');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 mt-2"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
