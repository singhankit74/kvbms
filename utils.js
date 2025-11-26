// Image Compression Utility
const ImageCompressor = {
    /**
     * Compress and resize image to meet requirements:
     * - Max size: 200KB
     * - Target width: ~1024px
     * - Maintain aspect ratio
     */
    async compressImage(file, maxSizeKB = 200, targetWidth = 1024) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const img = new Image();

                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    // Calculate new dimensions
                    let width = img.width;
                    let height = img.height;

                    if (width > targetWidth) {
                        height = (height * targetWidth) / width;
                        width = targetWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    // Draw image on canvas
                    ctx.drawImage(img, 0, 0, width, height);

                    // Try different quality levels to meet size requirement
                    this.findOptimalQuality(canvas, maxSizeKB)
                        .then(blob => resolve(blob))
                        .catch(err => reject(err));
                };

                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = e.target.result;
            };

            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    },

    async findOptimalQuality(canvas, maxSizeKB) {
        let quality = 0.9;
        let blob = null;

        while (quality > 0.1) {
            blob = await new Promise(resolve => {
                canvas.toBlob(resolve, 'image/jpeg', quality);
            });

            const sizeKB = blob.size / 1024;

            if (sizeKB <= maxSizeKB) {
                return blob;
            }

            quality -= 0.1;
        }

        // If still too large, return the smallest we can get
        return blob;
    },

    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }
};

// Excel Export Utility
const ExcelExporter = {
    async exportToExcel(data, filename = 'meter_readings_report.xlsx') {
        // Load SheetJS library if not already loaded
        if (typeof XLSX === 'undefined') {
            await this.loadSheetJS();
        }

        console.log('ExcelExporter: Exporting data:', data);

        // Data is already formatted with proper column headers from the calling function
        // No need to remap - just use it directly
        const worksheetData = data;

        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(worksheetData);

        // Set column widths dynamically based on headers
        const headers = Object.keys(data[0] || {});
        const colWidths = headers.map(() => ({ wch: 20 })); // 20 characters wide for all columns
        ws['!cols'] = colWidths;

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Report');

        // Generate and download file
        XLSX.writeFile(wb, filename);

        console.log('ExcelExporter: File generated successfully');
    },

    loadSheetJS() {
        return new Promise((resolve, reject) => {
            if (typeof XLSX !== 'undefined') {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js';
            script.onload = resolve;
            script.onerror = () => reject(new Error('Failed to load SheetJS library'));
            document.head.appendChild(script);
        });
    }
};

// Storage Utility for Supabase
const StorageManager = {
    async uploadImage(file, folder = 'meter-photos') {
        try {
            // Generate unique filename
            const timestamp = Date.now();
            const randomStr = Math.random().toString(36).substring(7);
            const extension = file.name.split('.').pop();
            const filename = `${folder}/${timestamp}_${randomStr}.${extension}`;

            // Upload to Supabase Storage
            const { data, error } = await supabase.storage
                .from('meter-photos')
                .upload(filename, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                throw error;
            }

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('meter-photos')
                .getPublicUrl(filename);

            return urlData.publicUrl;
        } catch (error) {
            console.error('Upload error:', error);
            throw new Error('Failed to upload image: ' + error.message);
        }
    },

    async deleteImage(url) {
        try {
            // Extract filename from URL
            const urlParts = url.split('/');
            const filename = urlParts[urlParts.length - 1];

            const { error } = await supabase.storage
                .from('meter-photos')
                .remove([`meter-photos/${filename}`]);

            if (error) {
                throw error;
            }
        } catch (error) {
            console.error('Delete error:', error);
            // Don't throw error, just log it
        }
    }
};

// Form Validation Utility
const FormValidator = {
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    validateRequired(value) {
        return value && value.trim().length > 0;
    },

    validateNumber(value) {
        return !isNaN(value) && value >= 0;
    },

    validateImage(file) {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        const maxSize = 10 * 1024 * 1024; // 10MB before compression

        if (!validTypes.includes(file.type)) {
            return { valid: false, message: 'Please upload a valid image (JPEG, PNG, or WebP)' };
        }

        if (file.size > maxSize) {
            return { valid: false, message: 'Image size must be less than 10MB' };
        }

        return { valid: true };
    }
};

// Date Utility
const DateUtils = {
    getTodayDate() {
        const today = new Date();
        return today.toISOString().split('T')[0];
    },

    formatDateForDisplay(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    formatTimeForDisplay(dateString) {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    },

    getDateRange(range) {
        const today = new Date();
        let startDate = new Date();

        switch (range) {
            case 'today':
                startDate = today;
                break;
            case 'week':
                startDate.setDate(today.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(today.getMonth() - 1);
                break;
            default:
                startDate = today;
        }

        return {
            start: startDate.toISOString().split('T')[0],
            end: today.toISOString().split('T')[0]
        };
    }
};
