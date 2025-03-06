// Global variables to control retries
let retryCount = 0;
const maxRetries = 3;
let retryDelay = 1000; // Start with 1 second delay, will increase exponentially

// Get URL parameters
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// Display area parameter
function displayAreaParameter() {
    const area = getUrlParameter('area') || '';
    const areaDisplay = document.getElementById('areaDisplay');
    
    if (area) {
        areaDisplay.textContent = area;
    } else {
        areaDisplay.textContent = document.body.classList.contains('rtl') ? 
            'نادي انتر ستي' : 'INTERCITY CLUB';
    }
}

// Show loading state
function showLoading() {
    const submitBtn = document.getElementById('submitBtn');
    const loadingSpinner = document.getElementById('loadingSpinner');
    submitBtn.disabled = true;
    loadingSpinner.style.display = 'block';
}

// Hide loading state
function hideLoading() {
    const submitBtn = document.getElementById('submitBtn');
    const loadingSpinner = document.getElementById('loadingSpinner');
    submitBtn.disabled = false;
    loadingSpinner.style.display = 'none';
}

// Show success message
function showSuccessMessage(message) {
    Swal.fire({
        icon: 'success',
        title: message,
        showConfirmButton: false,
        timer: 2000
    });
}

// Show error message with retry option
function showErrorWithRetry(message) {
    Swal.fire({
        icon: 'error',
        title: message,
        showCancelButton: true,
        confirmButtonText: document.body.classList.contains('rtl') ? 'المحاولة مرة أخرى' : 'Try Again',
        cancelButtonText: document.body.classList.contains('rtl') ? 'إلغاء' : 'Cancel'
    }).then((result) => {
        if (result.isConfirmed) {
            submitForm();
        }
    });
}

// Initialize area display
document.addEventListener('DOMContentLoaded', function() {
    displayAreaParameter();
    toggleLanguage(); 
});

// Toggle language
function toggleLanguage() {
    const body = document.body;
    const langSwitch = document.querySelector('.language-switch');
    const title = document.getElementById('title');
    const question = document.getElementById('question');
    const formNote = document.getElementById('form-note');
    const submitText = document.getElementById('submitText');
    const notesPlaceholder = document.getElementById('notes');
    const namePlaceholder = document.getElementById('name');
    const phonePlaceholder = document.getElementById('phone');
    
    if (body.classList.contains('rtl')) {
        body.classList.remove('rtl');
        body.classList.add('ltr');
        langSwitch.textContent = '🇪🇬 عربي';
        title.textContent = 'We value your feedback';
        question.textContent = 'How do you feel about the place or the service provided?';
        formNote.textContent = 'Suggestions are welcome. We are here for your happiness. If you find problems, or have suggestions, do not hesitate to share them with us.';
        submitText.textContent = 'Send';
        notesPlaceholder.placeholder = 'Share your thoughts with us';
        namePlaceholder.placeholder = 'Name or membership number';
        phonePlaceholder.placeholder = 'Contact phone number';
    } else {
        body.classList.remove('ltr');
        body.classList.add('rtl');
        langSwitch.textContent = 'English 🇬🇧';
        title.textContent = 'نقدر ملاحظاتك';
        question.textContent = 'كيف تشعر حول المكان أو الخدمة المقدمة؟';
        formNote.textContent = 'نرحب باقتراحاتكم. نحن هنا من أجل سعادتك. إذا واجهت مشاكل، أو لديك اقتراحات، لا تتردد في مشاركتها معنا.';
        submitText.textContent = 'إرسال';
        notesPlaceholder.placeholder = 'شارك أفكارك معنا';
        namePlaceholder.placeholder = 'الاسم أو رقم العضوية';
        phonePlaceholder.placeholder = 'رقم الهاتف للتواصل';
    }
    
    // Update area display based on language
    displayAreaParameter();
}

// Animated emojis on hover
const emojis = document.querySelectorAll('.emoji-icon');
emojis.forEach(emoji => {
    emoji.parentElement.addEventListener('mouseover', () => {
        emoji.style.animation = 'pulse 0.5s infinite';
    });
    
    emoji.parentElement.addEventListener('mouseout', () => {
        emoji.style.animation = '';
    });
});

// Submit form with retries
function submitForm() {
    // Clean up any existing status message
    const statusMessage = document.getElementById('statusMessage');
    statusMessage.innerHTML = '';
    statusMessage.style.display = 'none';
    
    const selectedEmoji = document.querySelector('input[name="feedback"]:checked');
    const notes = document.getElementById('notes').value;
    const name = document.getElementById('name').value;
    const phone = document.getElementById('phone').value;
    const area = getUrlParameter('area');

    // التحقق من أن حقل الهاتف يحتوي على أرقام فقط
    if (!/^\d+$/.test(phone)) {
        Swal.fire({
            icon: 'error',
            title: document.body.classList.contains('rtl') ? 'يرجا التاكد من رقم الهاتف' : 'Please check the phone number',
            showConfirmButton: true
        });
        return; // إيقاف الإرسال إذا كان الحقل يحتوي على أحرف غير رقمية
    }

    // Validate form
    if (!selectedEmoji) {
        Swal.fire({
            icon: 'error',
            title: document.body.classList.contains('rtl') ? 'يرجى تحديد تقييمك باختيار احد الاشكال' : 'Please select your rating by choosing one of the emojis',
            showConfirmButton: true
        });
        return;
    }
    
    // Show loading spinner
    showLoading();
    
    const requestData = {
        area: area,
        valuation: selectedEmoji.value,
        note: notes,
        name: name,
        phone: phone
    };
    
    // Use timeout to prevent hanging requests
    const fetchWithTimeout = (url, options, timeout = 10000) => {
        return Promise.race([
            fetch(url, options),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Request timed out')), timeout)
            )
        ]);
    };
    
    // Send the data with timeout
    fetchWithTimeout('send.php', {
        method: 'POST',

        body: JSON.stringify(requestData)
    }, 10000)
    .then(response => {
        if (!response.ok) {
            throw new Error('Server responded with status: ' + response.status);
        }
        return response.json();
    })
    .then(data => {
        hideLoading();
        retryCount = 0; // Reset retry count on success
        
        showSuccessMessage(document.body.classList.contains('rtl') ? 
            'تم إرسال ملاحظاتك بنجاح. شكرا لك!' : 'Your feedback has been successfully sent. Thank you!');
        
        // Reset form
        document.querySelectorAll('input[name="feedback"]').forEach(radio => radio.checked = false);
        document.getElementById('notes').value = '';
        document.getElementById('name').value = '';
        document.getElementById('phone').value = '';
    })
    .catch(error => {
        hideLoading();
        console.error('Error:', error);
        
        // Handle retries
        if (retryCount < maxRetries) {
            retryCount++;
            const isArabic = document.body.classList.contains('rtl');
            const errorMessage = isArabic ? 
                `حدث خطأ أثناء إرسال ملاحظاتك. جاري إعادة المحاولة تلقائياً (${retryCount}/${maxRetries})...` : 
                `An error occurred. Automatically retrying (${retryCount}/${maxRetries})...`;
            
            Swal.fire({
                icon: 'error',
                title: errorMessage,
                showConfirmButton: false,
                timer: 2000
            });
            
            // Exponential backoff for retries
            setTimeout(submitForm, retryDelay);
            retryDelay *= 2; // Double the delay for next retry
        } else {
            // Reach max retries, show error with manual retry option
            const isArabic = document.body.classList.contains('rtl');
            const errorMessage = isArabic ? 
                'حدث خطأ أثناء إرسال ملاحظاتك. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.' : 
                'An error occurred while sending your feedback. Please check your internet connection and try again.';
            
            showErrorWithRetry(errorMessage);
            retryCount = 0; // Reset retry count
            retryDelay = 1000; // Reset retry delay
        }
    });
}

// Initial form submission
document.getElementById('submitBtn').addEventListener('click', submitForm);

// Also allow submission by pressing Enter in the form fields
const formInputs = document.querySelectorAll('input, textarea');
formInputs.forEach(input => {
    input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            submitForm();
        }
    });
});