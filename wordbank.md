Exactly right — you want words where the bigram appears anywhere: start, middle, or end.                                                                  
                                                                                                                                                            
  For "th": "the" (start), "father" (middle), "bath" (end)                                                                                                  
                                                                                                                                                            
  How to build the mapping                                                                                                                                  
                                                                                                                                                            
  1. Get a large word list                                                                                                                                  
                                                                                                                                                            
  Options:                                                                                                                                                  
  - an-array-of-english-words npm package (~275k words)                                                                                                     
  - A frequency-filtered list from sources like COCA or Google n-grams                                                                                      
  - Aspell/Hunspell dictionary files                                                                                                                        
                                                                                                                                                            
  2. Process each word to extract bigrams                                                                                                                   
                                                                                                                                                            
  // For word "father"                                                                                                                                      
  getBigrams("father") → ["fa", "at", "th", "he", "er"]                                                                                                     
                                                                                                                                                            
  // Add "father" to each bigram's list:                                                                                                                    
  // "fa" → [..., "father"]                                                                                                                                 
  // "at" → [..., "father"]                                                                                                                                 
  // "th" → [..., "father"]                                                                                                                                 
  // etc.                                                                                                                                                   
                                                                                                                                                            
  3. Filter for quality                                                                                                                                     
                                                                                                                                                            
  - Word length 3-10 characters (typeable, not too obscure)                                                                                                 
  - Optionally filter by frequency (avoid rare words like "zymurgy")                                                                                        
  - Lowercase only                                                                                                                                          
                                                                                                                                                            
  4. Output structure                                                                                                                                       
                                                                                                                                                            
  {                                                                                                                                                         
    "th": ["the", "that", "this", "father", "bath", "think", ...],                                                                                          
    "qu": ["quick", "queen", "equal", "square", "quilt", ...],                                                                                              
    "ng": ["ring", "king", "doing", "change", "finger", ...],                                                                                               
    // ... all bigrams                                                                                                                                      
  }                                                                                                                                                         
                                                                                                                                                            
  ---                                                                                                                                                       
  Build script approach                                                                                                                                     
                                                                                                                                                            
  I can write a Node script that:                                                                                                                           
  1. Pulls from a large word list                                                                                                                           
  2. Builds the bigram → words mapping                                                                                                                      
  3. Outputs a JSON file you'd import into the app                                                                                                          
                                                                                                                                                            
  The JSON file would be maybe 1-3MB depending on how many words per bigram you keep. You could cap it at ~50-100 words per bigram to keep it reasonable.   
                                                                                                                                                            
  Want me to create this build script and the resulting mapping file?