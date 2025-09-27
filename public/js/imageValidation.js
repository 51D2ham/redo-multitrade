/**
 * Image Validation Utility
 * Validates image files before upload to prevent system crashes
 */

class ImageValidator {
  constructor(options = {}) {
    this.allowedTypes = options.allowedTypes || ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    this.maxFileSize = options.maxFileSize || 5 * 1024 * 1024; // 5MB default
    this.maxFiles = options.maxFiles || 10;
    this.showPreview = options.showPreview !== false;
  }

  /**
   * Validate a single file
   */
  validateFile(file) {
    const errors = [];

    // Check file type
    if (!this.allowedTypes.includes(file.type.toLowerCase())) {
      errors.push(`Invalid file type: ${file.name}. Only JPEG, PNG, and WebP images are allowed.`);
    }

    // Check file size
    if (file.size > this.maxFileSize) {
      const maxSizeMB = (this.maxFileSize / 1024 / 1024).toFixed(1);
      const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);
      errors.push(`File too large: ${file.name} (${fileSizeMB}MB). Maximum size is ${maxSizeMB}MB.`);
    }

    // Check if file is actually an image by checking file signature
    return new Promise((resolve) => {
      if (errors.length > 0) {
        resolve({ valid: false, errors });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const arr = new Uint8Array(e.target.result).subarray(0, 4);
        let header = '';
        for (let i = 0; i < arr.length; i++) {
          header += arr[i].toString(16);
        }

        // Check file signatures
        const validSignatures = {
          'ffd8ffe0': 'JPEG',
          'ffd8ffe1': 'JPEG',
          'ffd8ffe2': 'JPEG',
          'ffd8ffe3': 'JPEG',
          'ffd8ffe8': 'JPEG',
          '89504e47': 'PNG',
          '52494646': 'WebP'
        };

        const isValidImage = Object.keys(validSignatures).some(signature => 
          header.toLowerCase().startsWith(signature)
        );

        if (!isValidImage) {
          errors.push(`Invalid image file: ${file.name}. File appears to be corrupted or not a valid image.`);
        }

        resolve({ valid: errors.length === 0, errors });
      };

      reader.onerror = () => {
        errors.push(`Could not read file: ${file.name}`);
        resolve({ valid: false, errors });
      };

      reader.readAsArrayBuffer(file.slice(0, 4));
    });
  }

  /**
   * Validate multiple files
   */
  async validateFiles(files) {
    const fileArray = Array.from(files);
    const allErrors = [];

    // Check file count
    if (fileArray.length > this.maxFiles) {
      allErrors.push(`Too many files selected. Maximum ${this.maxFiles} files allowed.`);
      return { valid: false, errors: allErrors };
    }

    // Validate each file
    for (const file of fileArray) {
      const result = await this.validateFile(file);
      if (!result.valid) {
        allErrors.push(...result.errors);
      }
    }

    return { valid: allErrors.length === 0, errors: allErrors };
  }

  /**
   * Show validation errors to user
   */
  showErrors(errors, containerId = 'imageValidationErrors') {
    let container = document.getElementById(containerId);
    
    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      container.className = 'mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800';
      
      // Insert before the file input
      const fileInputs = document.querySelectorAll('input[type="file"]');
      if (fileInputs.length > 0) {
        fileInputs[0].parentNode.insertBefore(container, fileInputs[0]);
      }
    }

    container.innerHTML = `
      <div class="flex items-start gap-2">
        <div class="text-red-600 mt-0.5">
          <i class="fa fa-exclamation-triangle"></i>
        </div>
        <div>
          <h4 class="font-semibold mb-2">Image Upload Errors:</h4>
          <ul class="list-disc list-inside space-y-1">
            ${errors.map(error => `<li class="text-sm">${error}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
    
    container.style.display = 'block';
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
      if (container && container.parentNode) {
        container.style.display = 'none';
      }
    }, 10000);
  }

  /**
   * Hide validation errors
   */
  hideErrors(containerId = 'imageValidationErrors') {
    const container = document.getElementById(containerId);
    if (container) {
      container.style.display = 'none';
    }
  }

  /**
   * Create image preview
   */
  createPreview(files, previewContainerId) {
    if (!this.showPreview) return;

    const previewContainer = document.getElementById(previewContainerId);
    if (!previewContainer) return;

    previewContainer.innerHTML = '';
    previewContainer.style.display = files.length > 0 ? 'grid' : 'none';

    Array.from(files).forEach((file, index) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const div = document.createElement('div');
          div.className = 'relative border rounded-lg overflow-hidden bg-gray-50';
          div.innerHTML = `
            <img src="${e.target.result}" alt="Preview ${index + 1}" class="w-full h-32 object-cover">
            <div class="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
              ${index === 0 ? 'Main' : `#${index + 1}`}
            </div>
            <div class="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
              ${(file.size / 1024 / 1024).toFixed(1)}MB
            </div>
            <div class="absolute top-2 right-2">
              <div class="w-3 h-3 bg-green-500 rounded-full border-2 border-white" title="Valid image"></div>
            </div>
          `;
          previewContainer.appendChild(div);
        };
        reader.readAsDataURL(file);
      }
    });
  }

  /**
   * Initialize validation for a file input
   */
  initializeInput(inputId, previewContainerId = null) {
    const input = document.getElementById(inputId);
    if (!input) return;

    input.addEventListener('change', async (e) => {
      const files = e.target.files;
      
      if (files.length === 0) {
        this.hideErrors();
        if (previewContainerId) {
          const preview = document.getElementById(previewContainerId);
          if (preview) preview.style.display = 'none';
        }
        return;
      }

      // Validate files
      const validation = await this.validateFiles(files);
      
      if (!validation.valid) {
        // Show errors and clear input
        this.showErrors(validation.errors);
        e.target.value = '';
        if (previewContainerId) {
          const preview = document.getElementById(previewContainerId);
          if (preview) preview.style.display = 'none';
        }
        return;
      }

      // Hide any previous errors
      this.hideErrors();
      
      // Show preview if enabled
      if (previewContainerId) {
        this.createPreview(files, previewContainerId);
      }
    });

    // Prevent form submission if validation fails
    const form = input.closest('form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        const files = input.files;
        if (files.length > 0) {
          const validation = await this.validateFiles(files);
          if (!validation.valid) {
            e.preventDefault();
            this.showErrors(validation.errors);
            return false;
          }
        }
      });
    }
  }
}

// Global instance for easy use
window.ImageValidator = ImageValidator;

// Auto-initialize common image inputs when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Default validator instance
  const validator = new ImageValidator({
    maxFileSize: 5 * 1024 * 1024, // 5MB
    maxFiles: 10,
    showPreview: true
  });

  // Auto-initialize common input IDs
  const commonInputs = [
    { input: 'imageInput', preview: 'imagePreview' },
    { input: 'image', preview: 'imagePreview' },
    { input: 'images', preview: 'imagePreview' }
  ];

  commonInputs.forEach(({ input, preview }) => {
    if (document.getElementById(input)) {
      validator.initializeInput(input, preview);
    }
  });
});