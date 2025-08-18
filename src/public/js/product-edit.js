// Get data from data attributes
var dataElement = document.getElementById('product-data');
var variantCount = parseInt(dataElement.getAttribute('data-variant-count'));
var specificationCount = parseInt(dataElement.getAttribute('data-specification-count'));
var specListsData = JSON.parse(dataElement.getAttribute('data-spec-lists'));

function updateVariantNumbers() {
  var variants = document.querySelectorAll('.variant-item');
  variants.forEach(function(variant, index) {
    var title = variant.querySelector('h4');
    title.textContent = 'Variant #' + (index + 1);
    
    var inputs = variant.querySelectorAll('input, select');
    inputs.forEach(function(input) {
      var name = input.getAttribute('name');
      if (name && name.indexOf('[_id]') === -1) {
        input.setAttribute('name', name.replace(/\[\d+\]/, '[' + index + ']'));
      }
    });
  });
}

function updateDeleteButtons() {
  var variants = document.querySelectorAll('.variant-item');
  var deleteButtons = document.querySelectorAll('.delete-variant');
  
  deleteButtons.forEach(function(btn) {
    btn.style.display = variants.length > 1 ? 'block' : 'none';
  });
}

function createVariantItem(index) {
  return '<div class="variant-item border border-gray-200 rounded-lg p-4 mb-4">' +
    '<div class="flex justify-between items-center mb-4">' +
      '<h4 class="font-semibold text-gray-700">Variant #' + (index + 1) + '</h4>' +
      '<button type="button" class="delete-variant px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition text-sm">' +
        '<i class="fa fa-trash"></i> Delete' +
      '</button>' +
    '</div>' +
    '<div class="grid grid-cols-1 md:grid-cols-3 gap-4">' +
      '<div><label class="block font-semibold mb-1 text-gray-700">SKU *</label>' +
      '<input name="variants[' + index + '][sku]" type="text" required class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>' +
      '<div><label class="block font-semibold mb-1 text-gray-700">Regular Price *</label>' +
      '<input name="variants[' + index + '][price]" type="number" step="0.01" min="0" required class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>' +
      '<div><label class="block font-semibold mb-1 text-gray-700">Sale Price</label>' +
      '<input name="variants[' + index + '][discountPrice]" type="number" step="0.01" min="0" class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500" /></div>' +
      '<div><label class="block font-semibold mb-1 text-gray-700">Old Price</label>' +
      '<input name="variants[' + index + '][oldPrice]" type="number" step="0.01" min="0" class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500" /></div>' +
      '<div><label class="block font-semibold mb-1 text-gray-700">Quantity *</label>' +
      '<input name="variants[' + index + '][qty]" type="number" min="0" required class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>' +
      '<div><label class="block font-semibold mb-1 text-gray-700">Color</label>' +
      '<input name="variants[' + index + '][color]" type="text" class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>' +
      '<div><label class="block font-semibold mb-1 text-gray-700">Size</label>' +
      '<input name="variants[' + index + '][size]" type="text" class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>' +
      '<div><label class="block font-semibold mb-1 text-gray-700">Threshold Qty</label>' +
      '<input name="variants[' + index + '][thresholdQty]" type="number" min="0" value="5" class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>' +
    '</div>' +
    '<div class="mt-4 flex gap-6">' +
      '<label class="flex items-center">' +
        '<input name="variants[' + index + '][isDefault]" type="checkbox" value="true" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />' +
        '<span class="ml-2 text-sm text-gray-700">Default variant</span>' +
      '</label>' +
      '<label class="flex items-center">' +
        '<input name="variants[' + index + '][shipping]" type="checkbox" value="true" checked class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />' +
        '<span class="ml-2 text-sm text-gray-700">Shippable</span>' +
      '</label>' +
    '</div>' +
  '</div>';
}

function createSpecificationItem(index) {
  var optionsHtml = '<option value="">Choose specification type...</option>';
  specListsData.forEach(function(spec) {
    optionsHtml += '<option value="' + spec.id + '">' + spec.title + '</option>';
  });
  
  return '<div class="specification-item bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">' +
    '<div class="flex justify-between items-center mb-4">' +
      '<h4 class="font-semibold text-gray-700">Specification ' + (index + 1) + '</h4>' +
      '<button type="button" class="delete-specification px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition text-sm">' +
        '<i class="fa fa-trash"></i> Remove' +
      '</button>' +
    '</div>' +
    '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">' +
      '<div>' +
        '<label class="block font-medium mb-2 text-gray-700">Specification Type *</label>' +
        '<select name="specifications[' + index + '][specList]" required class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">' +
          optionsHtml +
        '</select>' +
      '</div>' +
      '<div>' +
        '<label class="block font-medium mb-2 text-gray-700">Value *</label>' +
        '<input name="specifications[' + index + '][value]" type="text" required class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500" />' +
      '</div>' +
    '</div>' +
  '</div>';
}

function toggleEmptyState() {
  var container = document.getElementById('specifications-container');
  var emptyState = document.getElementById('empty-specs');
  var specifications = document.querySelectorAll('.specification-item');
  
  if (specifications.length === 0 && emptyState) {
    emptyState.style.display = 'block';
  } else if (emptyState) {
    emptyState.style.display = 'none';
  }
}

function updateSpecificationNumbers() {
  var specifications = document.querySelectorAll('.specification-item');
  specifications.forEach(function(spec, index) {
    var title = spec.querySelector('h4');
    title.textContent = 'Specification ' + (index + 1);
    
    var inputs = spec.querySelectorAll('input, select');
    inputs.forEach(function(input) {
      var name = input.getAttribute('name');
      if (name) {
        input.setAttribute('name', name.replace(/\[\d+\]/, '[' + index + ']'));
      }
    });
  });
}

document.getElementById('add-variant').addEventListener('click', function() {
  var container = document.getElementById('variants-container');
  var newVariantDiv = document.createElement('div');
  newVariantDiv.innerHTML = createVariantItem(variantCount);
  var newVariant = newVariantDiv.firstElementChild;
  
  container.appendChild(newVariant);
  variantCount++;
  updateDeleteButtons();
});

document.getElementById('add-specification').addEventListener('click', function() {
  var container = document.getElementById('specifications-container');
  var emptyState = document.getElementById('empty-specs');
  
  if (emptyState) {
    emptyState.style.display = 'none';
  }
  
  var newSpecDiv = document.createElement('div');
  newSpecDiv.innerHTML = createSpecificationItem(specificationCount);
  var newSpec = newSpecDiv.firstElementChild;
  
  container.appendChild(newSpec);
  specificationCount++;
});

document.addEventListener('click', function(e) {
  if (e.target.closest('.delete-variant')) {
    var variant = e.target.closest('.variant-item');
    var variants = document.querySelectorAll('.variant-item');
    
    if (variants.length > 1) {
      variant.remove();
      updateVariantNumbers();
      updateDeleteButtons();
    }
  }
  
  if (e.target.closest('.delete-specification')) {
    var specification = e.target.closest('.specification-item');
    specification.remove();
    updateSpecificationNumbers();
    toggleEmptyState();
  }
  
  if (e.target.closest('.remove-image-btn')) {
    var btn = e.target.closest('.remove-image-btn');
    var index = parseInt(btn.getAttribute('data-image-index'));
    removeExistingImage(index);
  }
});

var removedImages = [];

function removeExistingImage(index) {
  if (confirm('Are you sure you want to remove this image?')) {
    removedImages.push(index);
    document.getElementById('removeImages').value = removedImages.join(',');
    
    var imageElements = document.querySelectorAll('.relative.group');
    if (imageElements[index]) {
      imageElements[index].style.display = 'none';
    }
  }
}

updateDeleteButtons();
toggleEmptyState();