const User = require('../models/User');
const Address = require('../models/Address');
const Order= require('../models/order');
const bcrypt = require('bcrypt');



exports.getProfilePage = async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).send('Unauthorized');
    }

    try {
        const userId = req.user._id;
        const user = await User.findById(userId).select('email username');
        const addresses = await Address.find({ userId });

        if (!user) {
            return res.status(404).send('User not found');
        }

        res.render('userSide/profile', {
            user,
            addresses
        });
    } catch (error) {
        console.error('Error rendering profile page:', error);
        res.status(500).send('Internal Server Error');
    }
};

exports.getPersonalInformation = async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).send('Unauthorized');
    }

    try {
        const userId = req.user._id; 
        const user = await User.findById(userId).select('email username');

        if (!user) {
            return res.status(404).send('User not found');
        }

        res.send(`
            <h3 style="color:green">Personal Information</h3>
            <p><strong>Username:</strong> <span id="user-username">${user.username}</span></p>
            <button id="edit-button">Edit</button>

<form id="edit-profile-form" method="POST" action="/user/update-profile" style="display:none; margin-top: 20px;">
    <div>
        <label><strong>Username:</strong></label>
        <input type="text" name="username" id="edit-username" required>
    </div>
    <div>
        <label><strong>Old Password:</strong></label>
        <input type="password" name="oldPassword" autocomplete="off" placeholder="Enter your old password" required>
    </div>
    <div>
        <label><strong>New Password:</strong></label>
        <input type="password" name="newPassword" autocomplete="new-password" placeholder="New Password" required>
    </div>
    <button type="submit">Save Changes</button>
    <button type="button" id="cancel-button">Cancel</button>
</form>

<!-- Success/Error messages -->
<div id="message-box" style="display:none; margin-top:20px;"></div>

<script>
    document.getElementById('edit-button').onclick = function() {
        document.getElementById('edit-username').value = document.getElementById('user-username').textContent;
        document.getElementById('edit-profile-form').style.display = 'block';
        this.style.display = 'none';
    };

    document.getElementById('cancel-button').onclick = function() {
        document.getElementById('edit-profile-form').style.display = 'none';
        document.getElementById('edit-button').style.display = 'inline'; 
    };

    document.getElementById('edit-profile-form').onsubmit = async function(event) {
        event.preventDefault(); 

        const formData = new FormData(this);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch(this.action, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.text();

            const messageBox = document.getElementById('message-box');
            messageBox.style.display = 'block';

            if (response.ok) {
                messageBox.textContent = 'Profile updated successfully';
                messageBox.style.color = 'green';
            } else {
                messageBox.textContent = result;
                messageBox.style.color = 'red';
            }

            document.getElementById('edit-profile-form').style.display = 'none';
            document.getElementById('edit-button').style.display = 'inline';
        } catch (error) {
            console.error('Error submitting form:', error);
        }
    };
</script>
        `);
        
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).send('Internal Server Error');
    }
};

exports.updateProfile = async (req, res) => {
    const { username, oldPassword, newPassword } = req.body;
    const userId = req.user._id;     

    try {
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).send('User not found');
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).send('Old password is incorrect');
        }

        user.username = username;
        user.password = newPassword; 

        await user.save();
        res.send('Profile updated successfully');
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).send('Internal Server Error');
    }
};

exports.getUserAddresses = async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).send('Unauthorized');
    }

    try {
        const userId = req.user._id;
        const addresses = await Address.find({ userId });

        let addressesHtml = `
            <h4 style="color:green">Add New Address</h4>
            <form id="new-address-form" onsubmit="return validateNewAddress()">
                <input type="text" name="name" placeholder="Name" required>
                <input type="text" name="mobileNumber" placeholder="Mobile Number" pattern="\\d{10}" title="Mobile number must be 10 digits" required>
                <input type="text" name="city" placeholder="City" required>
                <input type="text" name="state" placeholder="State" required>
                <input type="text" name="pinCode" placeholder="PIN Code" pattern="\\d{6}" title="PIN Code must be 6 digits" required>
                <button type="submit" style="color:white;border:none;background:green">Add Address</button>
            </form>            
            <hr/>
            <h3 style="color:green">Your Addresses</h3>
        `;

        addresses.forEach(address => {
            addressesHtml += `
                <div class="address" data-id="${address._id}" style="border: 1px solid #ccc; padding: 15px; margin: 10px 0; border-radius: 8px;">
                    <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
                        <p><span class="address-name">${address.name}</span></p>
                        <p><span class="address-mobileNumber">${address.mobileNumber}</span></p>
                        <p><span class="address-city">${address.city}</span></p>
                        <p><span class="address-state">${address.state}</span></p>
                        <p><span class="address-pinCode">${address.pinCode}</span></p>
                    </div>
                    <div style="margin-top: 5px;">
                        <button onclick="editAddress('${address._id}')" style="color:black; background:#FFC107;border:none; ">Edit</button>
                        <button onclick="deleteAddress('${address._id}')" style="color:white;background:red;border:none">Delete</button>
                    </div>
                        <form id="edit-address-form-${address._id}" style="display:none;" onsubmit="return updateAddress(event, '${address._id}')">
                            <input type="text" name="name" value="${address.name}" required>
                            <input type="text" name="mobileNumber" value="${address.mobileNumber}" pattern="\\d{10}" title="Mobile number must be 10 digits" required>
                            <input type="text" name="city" value="${address.city}" required>
                            <input type="text" name="state" value="${address.state}" required>
                            <input type="text" name="pinCode" value="${address.pinCode}" pattern="\\d{6}" title="PIN Code must be 6 digits" required>
                            <button type="submit" style="color:white;border:none;background:green">Save</button>
                            <button type="button" onclick="cancelEdit('${address._id}')" style="color:white;background:red;border:none">Cancel</button>
                        </form>
                    </div>
            `;
        });

        addressesHtml += `
            <script>
                function editAddress(addressId) {
                    document.getElementById('edit-address-form-' + addressId).style.display = 'block';
                    const addressDiv = document.querySelector('.address[data-id="' + addressId + '"]');
                    addressDiv.querySelectorAll('span').forEach(span => span.style.display = 'none'); 
                }

                function cancelEdit(addressId) {
                    document.getElementById('edit-address-form-' + addressId).style.display = 'none';
                    const addressDiv = document.querySelector('.address[data-id="' + addressId + '"]');
                    addressDiv.querySelectorAll('span').forEach(span => span.style.display = 'inline'); 
                }

                function updateAddress(event, addressId) {
                    event.preventDefault();
                    const form = document.getElementById('edit-address-form-' + addressId);
                    const formData = new FormData(form);
                    const data = Object.fromEntries(formData.entries());

                    fetch('/user/addresses/' + addressId + '/edit', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(data),
                    })
                    .then(response => response.json())
                    .then(updatedAddress => {
                        if (updatedAddress) {
                            const addressDiv = document.querySelector('.address[data-id="' + addressId + '"]');
                            addressDiv.querySelector('.address-name').textContent = updatedAddress.name;
                            addressDiv.querySelector('.address-mobileNumber').textContent = updatedAddress.mobileNumber;
                            addressDiv.querySelector('.address-city').textContent = updatedAddress.city;
                            addressDiv.querySelector('.address-state').textContent = updatedAddress.state;
                            addressDiv.querySelector('.address-pinCode').textContent = updatedAddress.pinCode;

                            cancelEdit(addressId);
                        } else {
                            alert('Error updating address');
                        }
                    })
                    .catch(error => console.error('Error updating address:', error));
                }

                function deleteAddress(addressId) {
                    fetch('/user/addresses/' + addressId, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    })
                    .then(response => {
                        if (response.ok) {
                            const addressDiv = document.querySelector('.address[data-id="' + addressId + '"]');
                            addressDiv.remove();
                        } else {
                            console.error('Error deleting address');
                        }
                    })
                    .catch(error => console.error('Error deleting address:', error));
                }
            </script>
        `;

        res.send(addressesHtml);
    } catch (error) {
        console.error('Error fetching addresses:', error);
        res.status(500).send('Internal Server Error');
    }
};

exports.getEditAddress = async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).send('Unauthorized');
    }

    try {
        const addressId = req.params.id;
        const address = await Address.findById(addressId);

        if (!address) {
            return res.status(404).send('Address not found');
        }

        const editAddressHtml = `
            <h3 style="color:green">Edit Address</h3>
<form id="edit-address-form-${address._id}" style="display:none;" onsubmit="updateAddress(event, '${address._id}')">
    <input type="text" name="name" value="${address.name}" required>
    <input type="text" name="mobileNumber" value="${address.mobileNumber}" pattern="\\d{6}" title="Mobile number must be 10 digits" required>
    <input type="text" name="city" value="${address.city}" required>
    <input type="text" name="state" value="${address.state}" required>
    <input type="text" name="pinCode" value="${address.pinCode}" pattern="\\d{6}" title="PIN Code must be 6 digits" required>
    <button type="submit" style="color:green">Save</button>
    <button type="button" onclick="cancelEdit('${address._id}')" style="color:red">Cancel</button>
</form>
        `;

        res.send(editAddressHtml);
    } catch (error) {
        console.error('Error fetching address for editing:', error);
        res.status(500).send('Internal Server Error');
    }
};

exports.updateAddress = async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).send('Unauthorized');
    }

    const addressId = req.params.id;
    const { name, mobileNumber, city, state, pinCode } = req.body;  

    try {
        const updatedAddress = await Address.findByIdAndUpdate(
            addressId,
            { name, mobileNumber, city, state, pinCode }, 
            { new: true, runValidators: true }
        );

        if (!updatedAddress) {
            return res.status(404).send('Address not found');
        }

        res.json(updatedAddress);  
    } catch (error) {
        console.error('Error updating address:', error);
        res.status(500).send('Internal Server Error');
    }
};


exports.deleteAddress = async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).send('Unauthorized');
    }

    try {
        const addressId = req.params.id; 
        const deletedAddress = await Address.findByIdAndDelete(addressId);

        if (!deletedAddress) {
            return res.status(404).send('Address not found');
        }

        res.send('Address deleted successfully');
    } catch (error) {
        console.error('Error deleting address:', error);
        res.status(500).send('Internal Server Error');
    }
};

exports.addNewAddress = async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).send('Unauthorized');
    }

    const { name, mobileNumber, address, city, state, pinCode } = req.body;

    try {
        const newAddress = new Address({
            userId: req.user._id,
            name,
            mobileNumber,
            address,
            city,
            state,
            pinCode
        });

        await newAddress.save();
        res.send('Address added successfully');
    } catch (error) {
        console.error('Error adding new address:', error);
        res.status(500).send('Internal Server Error');
    }
};

exports.getOrders = async (req, res) => {
    try {
        const userId = req.user.id; 
        const orders = await Order.find({ user: userId });
        res.render('userSide/orders', { orders });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).send('Server Error');
    }
};